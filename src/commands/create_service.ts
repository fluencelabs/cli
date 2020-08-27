import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class CreateService extends Command {
  static description = 'Create a service by a blueprint.'

  static examples = [
    `$ fluence create_service
[
  '..',
  '..'
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: false}),
    blueprint: flags.string({char: 'b', description: 'A blueprint to create a service', required: true})
  }

  static args = []

  async run() {
    const {flags} = this.parse(CreateService)

    let conn = await getConnection(flags);

    let result = await conn.createService(flags.blueprint, flags.targetPeer)

    if (result) {
      this.log(JSON.stringify(`Service is created successfully. Service id: ${result}`))
    }

    await conn.disconnect();
  }
}
