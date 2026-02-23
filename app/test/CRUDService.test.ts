/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect } from './expect';
import proxyquire from 'proxyquire';
import sinon from 'sinon';

// logger stubs
const stubError = sinon.stub();
const stubInfo = sinon.stub();
const stubDebug = sinon.stub();

function getCRUDServiceInstance(stubSql: any) {
	const { CRUDService } = proxyquire
		.noCallThru()
		.load('../persistence/fabric/CRUDService', {
			'../../common/helper': {
				helper: {
					getLogger: function() {
						return {
							error: stubError,
							info: stubInfo,
							debug: stubDebug,
							warn: sinon.stub()
						};
					}
				}
			}
		});
	return new CRUDService(stubSql);
}

describe('CRUDService', () => {
	let crudService: any;
	let stubGetRowsBySQlNoCondition: sinon.SinonStub;

	const VALID_NETWORK_NAME = 'test-network';
	const MOCK_CHANNELS = [
		{
			id: 1,
			channelname: 'mychannel',
			blocks: 10,
			channel_genesis_hash: 'abc123',
			transactions: 50,
			createdat: new Date().toISOString(),
			channel_hash: 'def456',
			latestdate: new Date().toISOString()
		}
	];

	beforeEach(() => {
		stubError.reset();
		stubInfo.reset();
		stubDebug.reset();

		stubGetRowsBySQlNoCondition = sinon.stub().resolves(MOCK_CHANNELS);
		const stubSql = {
			getRowsBySQlNoCondition: stubGetRowsBySQlNoCondition
		};
		crudService = getCRUDServiceInstance(stubSql);
	});

	describe('getChannelsInfo', () => {
		it('should call getRowsBySQlNoCondition with the network name parameter', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			expect(stubGetRowsBySQlNoCondition.calledOnce).to.be.true;
			const [sql, values] = stubGetRowsBySQlNoCondition.firstCall.args;
			expect(values).to.deep.equal([VALID_NETWORK_NAME]);
		});

		it('should use CROSS JOIN LATERAL for efficient latest block lookup', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			const [sql] = stubGetRowsBySQlNoCondition.firstCall.args;
			expect(sql.toUpperCase()).to.include('CROSS JOIN LATERAL');
		});

		it('should use LIMIT 1 in the lateral subquery', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			const [sql] = stubGetRowsBySQlNoCondition.firstCall.args;
			expect(sql.toUpperCase()).to.include('LIMIT 1');
		});

		it('should use EXISTS for peer_ref_channel filter instead of INNER JOIN', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			const [sql] = stubGetRowsBySQlNoCondition.firstCall.args;
			expect(sql.toUpperCase()).to.include('EXISTS');
			expect(sql.toUpperCase()).to.include('PEER_REF_CHANNEL');
			// Should NOT use INNER JOIN to peer_ref_channel (which caused the performance issue)
			expect(sql.toUpperCase()).to.not.include('INNER JOIN');
		});

		it('should order results by channel name', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			const [sql] = stubGetRowsBySQlNoCondition.firstCall.args;
			expect(sql.toUpperCase()).to.include('ORDER BY C.NAME');
		});

		it('should select latestDate from the lateral subquery alias', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			const [sql] = stubGetRowsBySQlNoCondition.firstCall.args;
			// New query uses b.latestDate from the lateral alias, not MAX(blocks.createdt)
			expect(sql).to.include('b.latestDate');
			expect(sql.toUpperCase()).to.not.include('MAX(BLOCKS.CREATEDT)');
		});

		it('should return the channels rows from the database', async () => {
			const result = await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			expect(result).to.deep.equal(MOCK_CHANNELS);
		});

		it('should log entry and exit at debug level', async () => {
			await crudService.getChannelsInfo(VALID_NETWORK_NAME);

			expect(stubDebug.calledTwice).to.be.true;
			const firstCall = stubDebug.firstCall.args[0];
			const secondCall = stubDebug.secondCall.args[0];
			expect(firstCall).to.include('entry');
			expect(secondCall).to.include('exit');
		});
	});
});
