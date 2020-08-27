import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Blueprints extends Command {
  static description = 'Get a list of blueprints from a node.'

  static examples = [
    `$ fluence blueprints
[
  '..',
  '..'
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
  }

  static args = []

  async run() {
    const {flags} = this.parse(Blueprints)

    let conn = await getConnection(flags.host, flags.port, flags.peer, flags.secretKey);

    let interfaces = await conn.getAvailableBlueprints(flags.targetPeer)

    this.log(JSON.stringify(interfaces, undefined, 2))
  }
}
