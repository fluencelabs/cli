import * as flags from '@oclif/command/lib/flags';
import Command from "../base";
import {getConnection} from "../connection";


export default class Call extends Command {
  static description = 'Call a service.'

  static examples = [
    `$ fluence call
fluence call --host 134.209.186.43 --port 9100 --peer 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM -t 12D3KooWPnLxnY71JDxvB3zbjKu9k1BCYNthGZw6iGrLYsR1RnWM -S b9ec12ba-c69f-4cf3-991a-7590aec7b662 -m 811deb12-a9ab-4cba-b219-9b48ce7dd5ce -a "[\\"123\\"]" -f greeting
[
  '..',
  '..'
]
`,
  ]

  static flags = {
    ...Command.flags,
    targetPeer: flags.string({char: 't', description: 'Host to connect to', required: true}),
    service: flags.string({char: 'S', description: 'Id of a service', required: true}),
    'module': flags.string({char: 'm', description: 'Id of a module', required: true}),
    args: flags.string({char: 'a', description: 'Arguments', required: true}),
    fname: flags.string({char: 'f', description: 'Name of a function', required: false}),

  }

  static args = []

  async run() {
    const {flags} = this.parse(Call)

    let conn = await getConnection(flags);

    let callArgs = JSON.parse(flags.args)

    let result = await conn.callService(flags.targetPeer, flags.service, flags.module, callArgs, flags.fname)

    this.log(JSON.stringify(result, undefined, 2));

    await conn.disconnect();
  }
}
