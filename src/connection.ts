import Fluence from "fluence";
import {FluenceClient} from "fluence/dist/fluenceClient";
const seed = require('fluence/dist/seed')

export async function getConnection(params: { host: string, port: number, peer: string, pkey?: string, logLevel: string }): Promise<FluenceClient> {

  let peerId;
  if (params.pkey) {
    peerId = await seed.seedToPeerId(params.pkey)
  } else {
    peerId = await Fluence.generatePeerId();
  }

  let multiaddr = `/ip4/${params.host}/tcp/${params.port}/ws/p2p/${params.peer}`;

  return Fluence.connect(multiaddr, peerId);
}
