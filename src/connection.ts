import Fluence from "fluence";
import {FluenceClient} from "fluence/dist/fluenceClient";
const seed = require('fluence/dist/seed')

export async function getConnection(host: string, port: number, hostPeer: string, pkey?: string): Promise<FluenceClient> {

  let peerId;
  if (pkey) {
    peerId = await seed.seedToPeerId(pkey)
  } else {
    peerId = await Fluence.generatePeerId();
  }

  let multiaddr = `/ip4/${host}/tcp/${port}/ws/p2p/${hostPeer}`;

  return Fluence.connect(multiaddr, peerId);
}
