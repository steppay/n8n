import {
	IDataObject,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse
} from 'n8n-workflow';

import Events from './Events';

import {
	rabbitmqConnectExchange,
} from './GenericFunctions';
 

export class SteppayTrigger implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Steppay Trigger',
        name: 'steppayTrigger',
        icon: 'file:Steppay.svg',
        group: ['trigger'],
        version: 1,
        subtitle: '={{$parameter["topic"]}}',
        description: 'Handle Steppay events via RabbitMQ',
        defaults: {
            name: 'Steppay Trigger',
            color: '#516FF7',
        },
        inputs: [],
        outputs: ['main'],
        credentials: [
			{
				name: 'rabbitmq',
				required: true,
			},
			{
				name: 'steppay',
				required: true
			}
		],
        webhooks: [],
        properties: [
            {
				displayName: 'Event',
				name: 'topic',
				type: 'options',
				default: '',
				description: '스텝페이 이벤트',
                options: Events
			},
			{
				displayName: 'Get vendor',
				name: 'resolveVendor',
				type: 'boolean',
				default: false,
				description: '이벤트 페이로드에 vendorUuid 가 없으면 무시됩니다.',
			},
			{
				displayName: 'Get customer',
				name: 'resolveCustomer',
				type: 'boolean',
				default: false,
				description: '이벤트 페이로드에 customerUuid 가 없으면 무시됩니다.',
			},
			{
				displayName: 'Get order',
				name: 'resolveOrder',
				type: 'boolean',
				default: false,
				description: '이벤트 페이로드에 orderCode 나 vendorUuid 가 없으면 무시됩니다.',
			}
        ],
    };
    
    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const serviceUrl = await this.getCredentials('steppay') as {
			productServiceUrl: string,
			accountServiceUrl: string
		};

		const topic = this.getNodeParameter('topic') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const resolveVendor = this.getNodeParameter('resolveVendor') as boolean;
		const resolveCustomer = this.getNodeParameter('resolveCustomer') as boolean;
		const resolveOrder = this.getNodeParameter('resolveOrder') as boolean;

		const channel = await rabbitmqConnectExchange.call(this, 'step-bus', 'topic', options);

		const self = this;

		const startConsumer = async () => {
            const q = await channel.assertQueue('', {
                exclusive: true
            })

            channel.bindQueue(q.queue, 'step-bus', topic);
			await channel.consume(q.queue, async (message: IDataObject) => {
				if (message !== null) {
					let content: IDataObject | string = message!.content!.toString();

					const item: INodeExecutionData = {
						json: JSON.parse(content as string),
					};

					await resolveMetadata(this.helpers.httpRequest, serviceUrl, { resolveVendor, resolveCustomer, resolveOrder }, item)

					self.emit([
						[
							item,
						],
					]);
					channel.ack(message);
				}
			});
		};

		startConsumer();

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			await channel.close();
			await channel.connection.close();
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.
		async function manualTriggerFunction() {
			startConsumer();
		}

		async function resolveMetadata(
			httpRequest: (requestOptions: IHttpRequestOptions) => Promise<IN8nHttpResponse | IN8nHttpFullResponse>,
			serviceUrl: { productServiceUrl: string, accountServiceUrl: string },
			params: { resolveVendor: boolean, resolveCustomer: boolean, resolveOrder: boolean },
			item: INodeExecutionData
		) {
			if (params.resolveVendor && item.json.vendorUuid) {
				item.vendor = await httpRequest({
					url: `${serviceUrl.accountServiceUrl}/api/internal/vendor/${item.json.vendorUuid}`,
					method: 'GET',
				}) as IDataObject
			}

			if (params.resolveCustomer && item.json.customerUuid) {
				item.customer = await httpRequest({
					url: `${serviceUrl.accountServiceUrl}/api/internal/customers/${item.json.customerUuid}`,
					method: 'GET',
				}) as IDataObject
			}

			if (params.resolveOrder && item.json.orderCode && item.json.vendorUuid) {
				item.order = await httpRequest({
					url: `${serviceUrl.productServiceUrl}/api/internal/orders/${item.json.orderCode}`,
					method: 'GET',
					headers: { vendorUuid: item.json.vendorUuid }
				}) as IDataObject
			}
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
 }