/**
 * 服务容器 - 依赖注入容器
 * @module core/ServiceContainer
 */

type ServiceFactory<T = unknown> = () => T

interface ServiceDescriptor {
  type: 'singleton' | 'transient'
  factory?: ServiceFactory
  instance?: unknown
}

export class ServiceContainer {
  private services: Map<string, ServiceDescriptor> = new Map()

  register<T>(name: string, service: T): void {
    this.services.set(name, {
      type: 'singleton',
      instance: service,
    })
  }

  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      type: 'singleton',
      factory: factory as ServiceFactory,
    })
  }

  registerTransient<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      type: 'transient',
      factory: factory as ServiceFactory,
    })
  }

  resolve<T>(name: string): T | undefined {
    const descriptor = this.services.get(name)
    if (!descriptor) {
      console.warn(`Service '${name}' not found`)
      return undefined
    }

    if (descriptor.type === 'singleton') {
      if (descriptor.instance) {
        return descriptor.instance as T
      }

      if (descriptor.factory) {
        descriptor.instance = descriptor.factory()
        return descriptor.instance as T
      }
    }

    if (descriptor.type === 'transient' && descriptor.factory) {
      return descriptor.factory() as T
    }

    return undefined
  }

  has(name: string): boolean {
    return this.services.has(name)
  }

  clear(): void {
    this.services.clear()
  }
}

export default ServiceContainer
