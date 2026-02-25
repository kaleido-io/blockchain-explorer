--
--    SPDX-License-Identifier: Apache-2.0
--
\c :dbname;

-- Performance indexes for blocks table (safe to run on existing installations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_network_name_channel_genesis_hash_idx ON public.blocks (network_name, channel_genesis_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_network_name_channel_createdt_idx ON public.blocks (network_name, channel_genesis_hash, createdt DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_network_name_channel_blocknum_idx ON public.blocks (network_name, channel_genesis_hash, blocknum);

--    Drop the single-column createdt index so the planner uses the composite index
--    above for the LATERAL getChannelsInfo query. Otherwise it may choose to
--    Index Scan Backward on blocks_createdt_idx and filter by network/channel,
--    scanning millions of rows per channel. All blocks queries in this app filter
--    by network_name and/or channel_genesis_hash, so the composite index suffices.
DROP INDEX CONCURRENTLY IF EXISTS blocks_createdt_idx;
