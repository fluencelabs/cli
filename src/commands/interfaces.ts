import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Interfaces extends Command {
  static description = 'Get a list of interfaces from a node.'

  static examples = [
    `$ fluence interfaces
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
    const {flags} = this.parse(Interfaces)

    let conn = await getConnection(flags);

    let interfaces = await conn.getActiveInterfaces(flags.targetPeer)

    this.log(JSON.stringify(interfaces, undefined, 2));

    await conn.disconnect();
  }
}
