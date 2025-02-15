import { getCredentialTypes,
	getCredentialsNewName,
	getAllCredentials,
	deleteCredential,
	getCredentialData,
	createNewCredential,
	updateCredential,
	oAuth2CredentialAuthorize,
	oAuth1CredentialAuthorize,
	testCredential,
} from '@/api/credentials';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import {
	ICredentialMap,
	ICredentialsResponse,
	ICredentialsState,
	ICredentialTypeMap,
	IRootState,
} from '../Interface';
import {
	ICredentialType,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
	INodeTypeDescription,
} from 'n8n-workflow';
import { getAppNameFromCredType } from '@/components/helpers';

const DEFAULT_CREDENTIAL_NAME = 'Unnamed credential';
const DEFAULT_CREDENTIAL_POSTFIX = 'account';
const TYPES_WITH_DEFAULT_NAME = ['httpBasicAuth', 'oAuth2Api', 'httpDigestAuth', 'oAuth1Api'];

const module: Module<ICredentialsState, IRootState> = {
	namespaced: true,
	state: {
		credentialTypes: {},
		credentials: {},
	},
	mutations: {
		setCredentialTypes: (state: ICredentialsState, credentialTypes: ICredentialType[]) => {
			state.credentialTypes = credentialTypes.reduce((accu: ICredentialTypeMap, cred: ICredentialType) => {
				accu[cred.name] = cred;

				return accu;
			}, {});
		},
		setCredentials: (state: ICredentialsState, credentials: ICredentialsResponse[]) => {
			state.credentials = credentials.reduce((accu: ICredentialMap, cred: ICredentialsResponse) => {
				if (cred.id) {
					accu[cred.id] = cred;
				}

				return accu;
			}, {});
		},
		upsertCredential(state: ICredentialsState, credential: ICredentialsResponse) {
			if (credential.id) {
				Vue.set(state.credentials, credential.id, credential);
			}
		},
		deleteCredential(state: ICredentialsState, id: string) {
			Vue.delete(state.credentials, id);
		},
		enableOAuthCredential(state: ICredentialsState, credential: ICredentialsResponse) {
			// enable oauth event to track change between modals
		},
	},
	getters: {
		allCredentialTypes(state: ICredentialsState): ICredentialType[] {
			return Object.values(state.credentialTypes)
				.sort((a, b) => a.displayName.localeCompare(b.displayName));
		},
		allCredentials(state: ICredentialsState): ICredentialsResponse[] {
			return Object.values(state.credentials)
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		allCredentialsByType(state: ICredentialsState, getters: any): {[type: string]: ICredentialsResponse[]} { // tslint:disable-line:no-any
			const credentials = getters.allCredentials as ICredentialsResponse[];
			const types = getters.allCredentialTypes as ICredentialType[];

			return types.reduce((accu: {[type: string]: ICredentialsResponse[]}, type: ICredentialType) => {
				accu[type.name] = credentials.filter((cred: ICredentialsResponse) => cred.type === type.name);

				return accu;
			}, {});
		},
		getCredentialTypeByName: (state: ICredentialsState) => {
			return (type: string) => state.credentialTypes[type];
		},
		getCredentialById: (state: ICredentialsState) => {
			return (id: string) => state.credentials[id];
		},
		getCredentialByIdAndType: (state: ICredentialsState) => {
			return (id: string, type: string) => {
				const credential = state.credentials[id];
				return !credential || credential.type !== type ? undefined : credential;
			};
		},
		getCredentialsByType: (state: ICredentialsState, getters: any) => { // tslint:disable-line:no-any
			return (credentialType: string): ICredentialsResponse[] => {
				return getters.allCredentialsByType[credentialType] || [];
			};
		},
		getNodesWithAccess (state: ICredentialsState, getters: any, rootState: IRootState, rootGetters: any) { // tslint:disable-line:no-any
			return (credentialTypeName: string) => {
				const nodeTypes: INodeTypeDescription[] = rootGetters.allNodeTypes;

				return nodeTypes.filter((nodeType: INodeTypeDescription) => {
					if (!nodeType.credentials) {
						return false;
					}

					for (const credentialTypeDescription of nodeType.credentials) {
						if (credentialTypeDescription.name === credentialTypeName ) {
							return true;
						}
					}

					return false;
				});
			};
		},
	},
	actions: {
		fetchCredentialTypes: async (context: ActionContext<ICredentialsState, IRootState>) => {
			if (context.getters.allCredentialTypes.length > 0) {
				return;
			}
			const credentialTypes = await getCredentialTypes(context.rootGetters.getRestApiContext);
			context.commit('setCredentialTypes', credentialTypes);
		},
		fetchAllCredentials: async (context: ActionContext<ICredentialsState, IRootState>) => {
			if (context.getters.allCredentials.length > 0) {
				return;
			}
			const credentials = await getAllCredentials(context.rootGetters.getRestApiContext);
			context.commit('setCredentials', credentials);
		},
		getCredentialData: async (context: ActionContext<ICredentialsState, IRootState>, { id }: {id: string}) => {
			return await getCredentialData(context.rootGetters.getRestApiContext, id);
		},
		createNewCredential: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsDecrypted) => {
			const credential = await createNewCredential(context.rootGetters.getRestApiContext, data);
			context.commit('upsertCredential', credential);

			return credential;
		},
		updateCredential: async (context: ActionContext<ICredentialsState, IRootState>, params: {data: ICredentialsDecrypted, id: string}) => {
			const { id, data } = params;
			const credential = await updateCredential(context.rootGetters.getRestApiContext, id, data);
			context.commit('upsertCredential', credential);

			return credential;
		},
		deleteCredential: async (context: ActionContext<ICredentialsState, IRootState>, { id }: {id: string}) => {
			const deleted = await deleteCredential(context.rootGetters.getRestApiContext, id);
			if (deleted) {
				context.commit('deleteCredential', id);
			}
		},
		oAuth2Authorize: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsResponse) => {
			return oAuth2CredentialAuthorize(context.rootGetters.getRestApiContext, data);
		},
		oAuth1Authorize: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsResponse) => {
			return oAuth1CredentialAuthorize(context.rootGetters.getRestApiContext, data);
		},
		testCredential: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsDecrypted): Promise<INodeCredentialTestResult> => {
			return testCredential(context.rootGetters.getRestApiContext, { credentials: data });
		},
		getNewCredentialName: async (context: ActionContext<ICredentialsState, IRootState>, params: { credentialTypeName: string }) => {
			try {
				const { credentialTypeName } = params;
				let newName = DEFAULT_CREDENTIAL_NAME;
				if (!TYPES_WITH_DEFAULT_NAME.includes(credentialTypeName)) {
					const { displayName } = context.getters.getCredentialTypeByName(credentialTypeName);
					newName = getAppNameFromCredType(displayName);
					newName = newName.length > 0 ? `${newName} ${DEFAULT_CREDENTIAL_POSTFIX}` : DEFAULT_CREDENTIAL_NAME;
				}

				const res = await getCredentialsNewName(context.rootGetters.getRestApiContext, newName);
				return res.name;
			} catch (e) {
				return DEFAULT_CREDENTIAL_NAME;
			}
		},
	},
};

export default module;
