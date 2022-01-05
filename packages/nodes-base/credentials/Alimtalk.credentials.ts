import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Alimtalk implements ICredentialType {
	name = 'alimtalk';
	displayName = '알림톡';
	properties: INodeProperties[] = [
		{
			displayName: 'appkey',
			name: 'appkey',
			type: 'string',
			default: '',
			placeholder: 'appkey',
		},
		{
			displayName: 'X-Secret-Key',
			name: 'xSecretKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'senderKey',
			name: 'senderKey',
			type: 'string',
			default: '',
			placeholder: 'senderKey',
		}
	];
}
