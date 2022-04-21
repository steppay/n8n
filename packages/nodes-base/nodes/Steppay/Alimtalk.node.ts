import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription
} from 'n8n-workflow';
 

export class Alimtalk implements INodeType {
    description: INodeTypeDescription = {
        displayName: '알림톡',
        name: 'alimtalk',
        icon: 'file:KakaoTalk.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["templateCode"]}}',
        description: 'Send alimtalk via NHN Toast',
        defaults: {
            name: '알림톡',
            color: '#ffe812',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
			{
				name: 'alimtalk',
				required: true,
			},
		],
        webhooks: [],
        properties: [
            {
				displayName: 'templateCode',
				name: 'templateCode',
				type: 'string',
				default: '',
				description: '등록한 발송 템플릿 코드 (최대 20자)',
			}
        ],
    };
    
    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const { appkey, xSecretKey, senderKey } = await this.getCredentials('alimtalk') as { appkey: string, xSecretKey: string, senderKey: string }
        const { env } = await this.getCredentials('steppay') as { env: string };

        const templateCode = this.getNodeParameter('templateCode', 0) as string
        
        const recipientList = this.getInputData().map(({ json }) => {
            let templateParameter = json.templateParameter as any
            if (env) {
                templateParameter.nudge = env
            }

            return { 
                recipientNo: json.recipientNo,
                templateParameter
            }
        })

        const response = await this.helpers.httpRequest({
            url: `https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/${appkey}/messages`,
            method: 'POST',
            headers: { "X-Secret-Key": xSecretKey },
            body: {
                senderKey,
                templateCode,
                recipientList
            }
        })

        console.log(response)

        return [[]];
    }
 }