/**
 *    SPDX-License-Identifier: Apache-2.0
 */

import * as requtil from './requestutils';
import { helper } from '../common/helper';

const logger = helper.getLogger('platformroutes');

/**
 *
 *
 * @param {*} router
 * @param {*} platform
 */
export async function platformroutes(
	router: {
		get: (
			arg0: string,
			arg1: {
				(req: any, res: any): any;
				(req: any, res: any): void;
				(req: any, res: any): any;
				(req: any, res: any): any;
				(req: any, res: any): void;
				(req: any, res: any): void;
				(req: any, res: any): void;
			}
		) => void;
	},
	platform: { getProxy: () => any }
) {
	const proxy = platform.getProxy();

	/**
	 * Transactions by Organization(s)
	 * GET /txByOrg
	 * curl -i 'http://<host>:<port>/txByOrg/<channel_genesis_hash>'
	 * Response:
	 * {'rows':[{'count':'4','creator_msp_id':'Org1'}]}
	 */
	router.get('/txByOrg/:channel_genesis_hash', (req, res) => {
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /txByOrg/%s] entry - network: %s',
			channel_genesis_hash,
			req.network
		);

		if (channel_genesis_hash) {
			proxy.getTxByOrgs(req.network, channel_genesis_hash).then((rows: any) => {
				logger.debug(
					'[GET /txByOrg/%s] exit - status: 200, duration: %dms',
					channel_genesis_hash,
					Date.now() - start
				);
				res.send({ status: 200, rows });
			});
		} else {
			logger.debug(
				'[GET /txByOrg/%s] exit - status: 400, duration: %dms',
				channel_genesis_hash,
				Date.now() - start
			);
			return requtil.invalidRequest(req, res);
		}
	});

	/**
	 * Channels
	 * GET /channels -> /channels/info
	 * curl -i 'http://<host>:<port>/channels/<info>'
	 * Response:
	 * [
	 * {
	 * 'channelName': 'mychannel',
	 * 'channel_hash': '',
	 * 'craetedat': '1/1/2018'
	 * }
	 * ]
	 */
	router.get('/channels/info', (req, res) => {
		const start = Date.now();
		logger.debug('[GET /channels/info] entry - network: %s', req.network);
		proxy
			.getChannelsInfo(req.network)
			.then((data: any[]) => {
				data.forEach((element: { createdat: string | number | Date }) => {
					element.createdat = new Date(element.createdat).toISOString();
				});
				logger.debug(
					'[GET /channels/info] exit - status: 200, count: %d, duration: %dms',
					data.length,
					Date.now() - start
				);
				res.send({ status: 200, channels: data });
			})
			.catch((err: any) => {
				logger.error(
					'[GET /channels/info] exit - status: 500, duration: %dms, error: %j',
					Date.now() - start,
					err
				);
				res.send({ status: 500, error: err });
			});
	});

	/**
	 * *Peer Status List
	 * GET /peerlist -> /peersStatus
	 * curl -i 'http://<host>:<port>/peersStatus/<channel>'
	 * Response:
	 * [
	 * {
	 * 'requests': 'grpcs://127.0.0.1:7051',
	 * 'server_hostname': 'peer0.org1.example.com'
	 * }
	 * ]
	 */
	router.get('/peersStatus/:channel', (req, res) => {
		const channelName = req.params.channel;
		const start = Date.now();
		logger.debug(
			'[GET /peersStatus/%s] entry - network: %s',
			channelName,
			req.network
		);
		if (channelName) {
			proxy.getPeersStatus(req.network, channelName).then((data: any) => {
				logger.debug(
					'[GET /peersStatus/%s] exit - status: 200, duration: %dms',
					channelName,
					Date.now() - start
				);
				res.send({ status: 200, peers: data });
			});
		} else {
			logger.debug(
				'[GET /peersStatus/%s] exit - status: 400, duration: %dms',
				channelName,
				Date.now() - start
			);
			return requtil.invalidRequest(req, res);
		}
	});

	/**
	 * *
	 * Block by number
	 * GET /block/getinfo -> /block
	 * curl -i 'http://<host>:<port>/block/<channel>/<number>'
	 */
	router.get('/block/:channel_genesis_hash/:number', (req, res) => {
		const number = parseInt(req.params.number);
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /block/%s/%d] entry - network: %s',
			channel_genesis_hash,
			number,
			req.network
		);
		if (!isNaN(number) && channel_genesis_hash) {
			proxy.getBlockByNumber(req.network, channel_genesis_hash, number).then(
				(block: {
					header: {
						number: { toString: () => any };
						previous_hash: { toString: (arg0: string) => any };
						data_hash: { toString: (arg0: string) => any };
					};
					data: { data: any };
				}) => {
					if (typeof block === 'string') {
						logger.error(
							'[GET /block/%s/%d] exit - status: 500, duration: %dms',
							channel_genesis_hash,
							number,
							Date.now() - start
						);
						res.send({ status: 500, error: block });
					} else {
						logger.debug(
							'[GET /block/%s/%d] exit - status: 200, duration: %dms',
							channel_genesis_hash,
							number,
							Date.now() - start
						);
						res.send({
							status: 200,
							number: block.header.number.toString(),
							previous_hash: block.header.previous_hash.toString('hex'),
							data_hash: block.header.data_hash.toString('hex'),
							transactions: block.data.data
						});
					}
				}
			);
		} else {
			logger.debug(
				'[GET /block/%s/%d] exit - status: 400, duration: %dms',
				channel_genesis_hash,
				number,
				Date.now() - start
			);
			return requtil.invalidRequest(req, res);
		}
	});

	/**
	 * Return list of channels
	 * GET /channellist -> /channels
	 * curl -i http://<host>:<port>/channels
	 * Response:
	 * {
	 * 'channels': [
	 * {
	 * 'channel_id': 'mychannel'
	 * }
	 * ]
	 * }
	 */
	router.get('/channels', (req, res) => {
		const start = Date.now();
		logger.debug('[GET /channels] entry - network: %s', req.network);
		proxy.getChannels(req.network).then((channels: any) => {
			logger.debug(
				'[GET /channels] exit - status: 200, count: %d, duration: %dms',
				channels ? channels.length : 0,
				Date.now() - start
			);
			const response = {
				status: 200,
				channels: channels
			};
			res.send(response);
		});
	});

	/**
	 * Return current channel
	 * GET /curChannel
	 * curl -i 'http://<host>:<port>/curChannel'
	 */
	router.get('/curChannel', (req, res) => {
		const start = Date.now();
		logger.debug('[GET /curChannel] entry - network: %s', req.network);
		proxy.getCurrentChannel(req.network).then((data: any) => {
			logger.debug(
				'[GET /curChannel] exit - status: 200, duration: %dms',
				Date.now() - start
			);
			res.send(data);
		});
	});

	/**
	 * Return change channel
	 * POST /changeChannel
	 * curl -i 'http://<host>:<port>/curChannel'
	 */
	router.get('/changeChannel/:channel_genesis_hash', (req, res) => {
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /changeChannel/%s] entry - network: %s',
			channel_genesis_hash,
			req.network
		);
		proxy.changeChannel(req.network, channel_genesis_hash).then((data: any) => {
			logger.debug(
				'[GET /changeChannel/%s] exit - status: 200, duration: %dms',
				channel_genesis_hash,
				Date.now() - start
			);
			res.send({
				currentChannel: data
			});
		});
	});

	/**
	 * *
	 * Block by block number
	 * GET /fetchDataByBlockNo
	 * curl -i 'http://<host>:<port>/fetchDataByBlockNo/<channel_genesis_hash>/<blockNo>'
	 */
	router.get(
		'/fetchDataByBlockNo/:channel_genesis_hash/:blockNo',
		(req, res) => {
			const blockNo = parseInt(req.params.blockNo);
			const channel_genesis_hash = req.params.channel_genesis_hash;
			const start = Date.now();
			logger.debug(
				'[GET /fetchDataByBlockNo/%s/%d] entry - network: %s',
				channel_genesis_hash,
				blockNo,
				req.network
			);
			if (!isNaN(blockNo) && channel_genesis_hash) {
				proxy
					.fetchDataByBlockNo(req.network, channel_genesis_hash, blockNo)
					.then((data: any) => {
						if (data !== 'response_payloads is null') {
							logger.debug(
								'[GET /fetchDataByBlockNo/%s/%d] exit - status: 200, duration: %dms',
								channel_genesis_hash,
								blockNo,
								Date.now() - start
							);
							res.send({ status: 200, data: data });
						} else {
							logger.debug(
								'[GET /fetchDataByBlockNo/%s/%d] exit - status: 404, duration: %dms',
								channel_genesis_hash,
								blockNo,
								Date.now() - start
							);
							res.send({ status: 404, data: 'Block not found' });
						}
					});
			} else {
				logger.debug(
					'[GET /fetchDataByBlockNo/%s/%d] exit - status: 400, duration: %dms',
					channel_genesis_hash,
					blockNo,
					Date.now() - start
				);
				return requtil.invalidRequest(req, res);
			}
		}
	);

	/**
	 * *
	 * Blocks by block range
	 * GET /fetchDataByBlockRange
	 * curl -i 'http://<host>:<port>/fetchDataByBlockRange/<channel_genesis_hash>/<startBlockNo>/<endBlockNo>'
	 */

	router.get(
		'/fetchDataByBlockRange/:channel_genesis_hash/:startBlockNo/:endBlockNo',
		(req, res) => {
			const startBlockNo = parseInt(req.params.startBlockNo);
			const endBlockNo = parseInt(req.params.endBlockNo);
			const channel_genesis_hash = req.params.channel_genesis_hash;
			const start = Date.now();
			logger.debug(
				'[GET /fetchDataByBlockRange/%s/%d/%d] entry - network: %s',
				channel_genesis_hash,
				startBlockNo,
				endBlockNo,
				req.network
			);
			if (
				startBlockNo <= endBlockNo &&
				startBlockNo >= 0 &&
				endBlockNo >= 0 &&
				!isNaN(startBlockNo) &&
				!isNaN(endBlockNo) &&
				channel_genesis_hash
			) {
				proxy
					.fetchDataByBlockRange(
						req.network,
						channel_genesis_hash,
						startBlockNo,
						endBlockNo
					)
					.then((data: any) => {
						if (data !== 'response_payloads is null') {
							logger.debug(
								'[GET /fetchDataByBlockRange/%s/%d/%d] exit - status: 200, duration: %dms',
								channel_genesis_hash,
								startBlockNo,
								endBlockNo,
								Date.now() - start
							);
							res.send({ status: 200, data: data });
						} else {
							logger.debug(
								'[GET /fetchDataByBlockRange/%s/%d/%d] exit - status: 404, duration: %dms',
								channel_genesis_hash,
								startBlockNo,
								endBlockNo,
								Date.now() - start
							);
							res.send({ status: 404, data: 'Block(s) not found' });
						}
					});
			} else {
				logger.debug(
					'[GET /fetchDataByBlockRange/%s/%d/%d] exit - status: 400, duration: %dms',
					channel_genesis_hash,
					startBlockNo,
					endBlockNo,
					Date.now() - start
				);
				return requtil.invalidRequest(req, res);
			}
		}
	);

	/**
	 * *
	 * Transaction by txn id
	 * GET /fetchDataByTxnId
	 * curl -i 'http://<host>:<port>/fetchDataByTxnId/<channel_genesis_hash>/<txnId>'
	 */
	router.get('/fetchDataByTxnId/:channel_genesis_hash/:txnId', (req, res) => {
		const txnId = req.params.txnId;
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /fetchDataByTxnId/%s/%s] entry - network: %s',
			channel_genesis_hash,
			txnId,
			req.network
		);
		proxy
			.fetchDataByTxnId(req.network, channel_genesis_hash, txnId)
			.then((data: any) => {
				if (data != null) {
					logger.debug(
						'[GET /fetchDataByTxnId/%s/%s] exit - status: 200, duration: %dms',
						channel_genesis_hash,
						txnId,
						Date.now() - start
					);
					res.send({ status: 200, data: data });
				} else {
					logger.debug(
						'[GET /fetchDataByTxnId/%s/%s] exit - status: 404, duration: %dms',
						channel_genesis_hash,
						txnId,
						Date.now() - start
					);
					res.send({ status: 404, data: 'Transaction not found' });
				}
			});
	});

	/**
	 * Return channel metadata
	 * GET /metadata
	 * curl -i 'http://<host>:<port>/metadata/<chaincode>'
	 */
	router.get('/metadata/:channel_genesis_hash/:chaincode', (req, res) => {
		const chaincode = req.params.chaincode;
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /metadata/%s/%s] entry - network: %s',
			channel_genesis_hash,
			chaincode,
			req.network
		);
		if (chaincode && channel_genesis_hash) {
			proxy
				.getContractMetadata(req.network, chaincode, channel_genesis_hash)
				.then((data: any) => {
					logger.debug(
						'[GET /metadata/%s/%s] exit - status: 200, duration: %dms',
						channel_genesis_hash,
						chaincode,
						Date.now() - start
					);
					res.send({ status: 200, data: data });
				});
		} else {
			logger.debug(
				'[GET /metadata/%s/%s] exit - status: 400, duration: %dms',
				channel_genesis_hash,
				chaincode,
				Date.now() - start
			);
			return requtil.invalidRequest(req, res);
		}
	});

	router.get('/fetchBlockByTxId/:channel_genesis_hash/:txnId', (req, res) => {
		const txnId = req.params.txnId;
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /fetchBlockByTxId/%s/%s] entry - network: %s',
			channel_genesis_hash,
			txnId,
			req.network
		);

		if (txnId && channel_genesis_hash) {
			proxy
				.fetchBlockByTxId(req.network, channel_genesis_hash, txnId)
				.then((data: any) => {
					if (data) {
						logger.debug(
							'[GET /fetchBlockByTxId/%s/%s] exit - status: 200, duration: %dms',
							channel_genesis_hash,
							txnId,
							Date.now() - start
						);
						res.send({ status: 200, data: data });
					} else {
						logger.debug(
							'[GET /fetchBlockByTxId/%s/%s] exit - status: 404, duration: %dms',
							channel_genesis_hash,
							txnId,
							Date.now() - start
						);
						res.send({ status: 404, data: 'Transaction details not found' });
					}
				});
		} else {
			logger.debug(
				'[GET /fetchBlockByTxId/%s/%s] exit - status: 400, duration: %dms',
				channel_genesis_hash,
				txnId,
				Date.now() - start
			);
			return requtil.invalidRequest(req, res);
		}
	});

	router.get(
		'/fetchBlockByHash/:channel_genesis_hash/:block_hash',
		(req, res) => {
			const blockHash = req.params.block_hash;
			const channel_genesis_hash = req.params.channel_genesis_hash;
			const start = Date.now();
			logger.debug(
				'[GET /fetchBlockByHash/%s/%s] entry - network: %s',
				channel_genesis_hash,
				blockHash,
				req.network
			);

			if (blockHash && channel_genesis_hash) {
				proxy
					.fetchBlockByHash(req.network, channel_genesis_hash, blockHash)
					.then((data: any) => {
						if (data) {
							logger.debug(
								'[GET /fetchBlockByHash/%s/%s] exit - status: 200, duration: %dms',
								channel_genesis_hash,
								blockHash,
								Date.now() - start
							);
							res.send({ status: 200, data: data });
						} else {
							logger.debug(
								'[GET /fetchBlockByHash/%s/%s] exit - status: 404, duration: %dms',
								channel_genesis_hash,
								blockHash,
								Date.now() - start
							);
							res.send({ status: 404, data: 'Transaction details not found' });
						}
					});
			} else {
				logger.debug(
					'[GET /fetchBlockByHash/%s/%s] exit - status: 400, duration: %dms',
					channel_genesis_hash,
					blockHash,
					Date.now() - start
				);
				return requtil.invalidRequest(req, res);
			}
		}
	);

	router.get('/fetchEndorsersCommitter/:channel_genesis_hash', (req, res) => {
		const channel_genesis_hash = req.params.channel_genesis_hash;
		const start = Date.now();
		logger.debug(
			'[GET /fetchEndorsersCommitter/%s] entry - network: %s',
			channel_genesis_hash,
			req.network
		);

		if (channel_genesis_hash) {
			proxy
				.fetchEndorsersCommitter(req.network, channel_genesis_hash)
				.then((data: any) => {
					if (data) {
						logger.debug(
							'[GET /fetchEndorsersCommitter/%s] exit - status: 200, duration: %dms',
							channel_genesis_hash,
							Date.now() - start
						);
						res.send({ status: 200, data: data });
					} else {
						logger.debug(
							'[GET /fetchEndorsersCommitter/%s] exit - status: 404, duration: %dms',
							channel_genesis_hash,
							Date.now() - start
						);
						res.send({ status: 404, data: 'Data not found' });
					}
				});
		} else {
			logger.debug(
				'[GET /fetchEndorsersCommitter/%s] exit - status: 400, duration: %dms',
				channel_genesis_hash,
				Date.now() - start
			);
			return requtil.invalidRequest(req, res);
		}
	});
} // End platformroutes()
