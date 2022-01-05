import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
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
			}
        ],
    };
    
    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const topic = this.getNodeParameter('topic') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

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
						json: {},
					};

                    content = JSON.parse(content as string);
                    message.content = content;
                    item.json = message;

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

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
 }