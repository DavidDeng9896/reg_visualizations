import type { FlowNodePort } from './graph'

/** 检查源端口类型是否可以连接到目标端口类型。 */
export function canConnectPorts(source: FlowNodePort, target: FlowNodePort): boolean {
  return source.type === target.type
}
