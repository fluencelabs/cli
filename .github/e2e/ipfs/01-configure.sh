#!/bin/sh
ipfs bootstrap rm --all

ipfs config Addresses.API "/ip4/0.0.0.0/tcp/5001"
ipfs config Addresses.Gateway "/ip4/0.0.0.0/tcp/8001"
ipfs config --json Addresses.Swarm '["/ip4/0.0.0.0/tcp/4001", "/ip4/0.0.0.0/tcp/4001/ws"]'
ipfs config --json Addresses.Announce '["/ip4/10.50.10.1/tcp/4001", "/ip4/10.50.10.1/tcp/4001/ws"]'

ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST"]'

ipfs config --json Pubsub.Enabled true
