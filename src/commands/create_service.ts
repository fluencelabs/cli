import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class CreateService extends Command {
  static description = 'Create a service by a blueprint. Returns a service id.'

  static examples = [
    `$ fluence create_service --blueprint fc231465-5292-4983-94a0-3bc1d7652153 --host 134.209.186.43 --port 9100 --peer 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM
24b47793-2706-41fc-91b2-675ff38ebda0
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
