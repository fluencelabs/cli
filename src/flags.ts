import * as flags from '@oclif/command/lib/flags';

export const commonFlags: flags.Input<any> = {
  help: flags.help({char: 'h'}),
  host: flags.string({char: 'h', description: 'Host to connect to', default: "127.0.0.1"}),
  port: flags.integer({char: 'p', description: 'Port to connect to', default: 9100}),
  peer: flags.string({char: 'P', description: 'Host to connect to', required: false})
}
