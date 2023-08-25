import { LoggerConf, ReqLogsInput } from '@/types/logger'

export const loggerConf: LoggerConf = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'yyyy-mm-dd - HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
        singleLine: true,
      },
    },
  },
  production: true,
  test: false,
}

export const addReqLogs = ({ req, error, description, extras }: ReqLogsInput) => {
  const logInfos = {
    description,
    ...extras,
  }

  if (error) {
    req.log.error({
      ...logInfos,
      error: {
        message: typeof error === 'string' ? error : error?.message,
        trace: error instanceof Error && error?.stack,
      },
    },
    'processing request')
    return
  }

  req.log.info(logInfos, 'processing request')
}
