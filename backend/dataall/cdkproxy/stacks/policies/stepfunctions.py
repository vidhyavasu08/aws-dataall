from aws_cdk import aws_iam as aws_iam

from .service_policy import ServicePolicy


class StepFunctions(ServicePolicy):
    def get_statements(self):
        return [
            aws_iam.PolicyStatement(
                sid='ListMonitorStepFunctions',
                effect=aws_iam.Effect.ALLOW,
                actions=[
                    'states:ListStateMachines',
                    'states:ListActivities',
                    'states:SendTaskFailure',
                    'states:SendTaskSuccess',
                    'states:SendTaskHeartbeat',
                ],
                resources=['*'],
            ),
            aws_iam.PolicyStatement(
                sid='CreateTeamStepFunctions',
                effect=aws_iam.Effect.ALLOW,
                actions=[
                    'states:CreateStateMachine',
                    'states:TagResource',
                    'states:UntagResource',
                ],
                resources=[
                    f'arn:aws:states:{self.region}:{self.account}:stateMachine:{self.resource_prefix}*',
                ],
                conditions={
                    'StringEquals': {
                        f'aws:RequestTag/{self.tag_key}': [self.tag_value]
                    }
                },
            ),
            aws_iam.PolicyStatement(
                sid='ManageTeamStepFunctions',
                effect=aws_iam.Effect.ALLOW,
                actions=['states:*'],
                resources=[
                    f'arn:aws:states:{self.region}:{self.account}:execution:{self.resource_prefix}*:*',
                    f'arn:aws:states:{self.region}:{self.account}:activity:*',
                    f'arn:aws:states:{self.region}:{self.account}:stateMachine:{self.resource_prefix}*'
                ],
                conditions={
                    'StringEquals': {
                        f'aws:ResourceTag/{self.tag_key}': [self.tag_value]
                    }
                },
            ),
        ]
