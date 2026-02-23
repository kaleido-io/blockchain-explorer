--
--    SPDX-License-Identifier: Apache-2.0
--
\c :dbname;

-- Performance indexes for blocks table (safe to run on existing installations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_network_name_channel_genesis_hash_idx ON public.blocks (network_name, channel_genesis_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_network_name_channel_createdt_idx ON public.blocks (network_name, channel_genesis_hash, createdt DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_network_name_channel_blocknum_idx ON public.blocks (network_name, channel_genesis_hash, blocknum);
