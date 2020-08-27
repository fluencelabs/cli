import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Modules extends Command {
  static description = 'Get a list of modules from a node.'

  static examples = [
    `$ fluence modules
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
    const {flags} = this.parse(Modules)

    let conn = await getConnection(flags);

    let modulesList = await conn.getAvailableModules(flags.targetPeer)

    this.log(JSON.stringify(modulesList, undefined, 2))
  }
}
