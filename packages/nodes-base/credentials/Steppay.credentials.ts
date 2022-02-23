import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Steppay implements ICredentialType {
	name = 'steppay';
	displayName = '스텝페이';
	properties: INodeProperties[] = [
		{
			displayName: 'productServiceUrl',
			name: 'productServiceUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'accountServiceUrl',
			name: 'accountServiceUrl',
			type: 'string',
			default: '',
		},
		{
			displayName: 'storeServiceUrl',
			name: 'storeServiceUrl',
			type: 'string',
			default: '',
		}
	];
}
