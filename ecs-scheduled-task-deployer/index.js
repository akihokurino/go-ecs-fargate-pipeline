const AWS = require('aws-sdk')
const codepipeline = new AWS.CodePipeline()
const cwevents = new AWS.CloudWatchEvents()
const ecs = new AWS.ECS()
const unzip = require('node-zip')

exports.handler = async (event, context) => {
    const job = event['CodePipeline.job'];
    const jobID = job.id

    try {
        const jobData = job.data
        const ecsScheduleRuleName = jobData.actionConfiguration.configuration.UserParameters
        const imageDefinitionLocation = jobData.inputArtifacts[0].location.s3Location
        const artifactCredentials = jobData.artifactCredentials

        // use specified credentials
        const s3 = new AWS.S3(artifactCredentials)
        const imageDefinitionObject = await s3.getObject({Bucket: imageDefinitionLocation.bucketName, Key: imageDefinitionLocation.objectKey}).promise()
        const imageDefinition = JSON.parse(unzip(imageDefinitionObject.Body).files['imagedefinitions.json'].asText())[0]

        const targets = await cwevents.listTargetsByRule({Rule: ecsScheduleRuleName}).promise()
        // create new task definitions and map to new targets
        const newTargets = await Promise.all(targets.Targets.map(async t => {
            const tdRes = await ecs.describeTaskDefinition({taskDefinition: t.EcsParameters.TaskDefinitionArn}).promise()
            const td = tdRes.taskDefinition
            let replaced = false
            td.containerDefinitions = tdRes.taskDefinition.containerDefinitions.map(cd => {
                if (cd.name !== imageDefinition.name) {
                    return cd
                }
                replaced = true
                cd.image = imageDefinition.imageUri
                return cd
            })
            if (!replaced) {
                throw new Error(`update target container not found: ${imageDefinition.name}`);
            }

            // remove unneed params
            ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'compatibilities'].forEach(k => { delete td[k] })

            // partial update
            const registerRes = await ecs.registerTaskDefinition(td).promise()
            t.EcsParameters.TaskDefinitionArn = registerRes.taskDefinition.taskDefinitionArn
            return t
        }))
        const putTargetsParam = {Rule: ecsScheduleRuleName, Targets: newTargets}
        const putTargetsRes = await cwevents.putTargets(putTargetsParam).promise()
        if (putTargetsRes.FailedEntryCount > 0 ) {
            throw new Error(`failed to put target: ${JSON.stringify(putTargetsRes.FailedEntries)}`)
        }
        // notify success
        await codepipeline.putJobSuccessResult({jobId: jobID}).promise()
        return putTargetsParam
    } catch(err) {
        // notify failure
        await codepipeline.putJobFailureResult({
            jobId: jobID,
            failureDetails: {
                message: JSON.stringify(err.message),
                type: 'JobFailed',
                externalExecutionId: context.invokeid
            }
        }).promise()
        throw err
    }
}