import { TagConfig, TagDomain, TagTopic, TagMethod } from '../types/tagTypes';

export function getDomainNames(config: TagConfig): string[] {
  return config.domains
    .filter(d => d.topics.length > 0)
    .map(d => d.name);
}

export function getDomainTopics(config: TagConfig, domainName: string): string[] {
  const domain = config.domains.find(d => d.name === domainName);
  return domain ? domain.topics.map(t => t.name) : [];
}

export function getMethodNames(config: TagConfig): string[] {
  return config.methods.map(m => m.name);
}

export function getAllDomainNames(config: TagConfig): string[] {
  return config.domains.map(d => d.name);
}

export function getAllTagNames(config: TagConfig): string[] {
  const domainNames = config.domains.map(d => d.name);
  const topicNames = config.domains.flatMap(d => d.topics.map(t => t.name));
  const methodNames = config.methods.map(m => m.name);
  return [...domainNames, ...topicNames, ...methodNames];
}

export function getDomainByTopic(config: TagConfig, topicName: string): string | undefined {
  for (const domain of config.domains) {
    if (domain.topics.some(t => t.name === topicName)) {
      return domain.name;
    }
  }
  return undefined;
}

export function findDomain(config: TagConfig, domainName: string): TagDomain | undefined {
  return config.domains.find(d => d.name === domainName);
}

export function findTopic(config: TagConfig, topicName: string): { domain: TagDomain; topic: TagTopic } | undefined {
  for (const domain of config.domains) {
    const topic = domain.topics.find(t => t.name === topicName);
    if (topic) return { domain, topic };
  }
  return undefined;
}

export function findMethod(config: TagConfig, methodName: string): TagMethod | undefined {
  return config.methods.find(m => m.name === methodName);
}

export function hasDomain(config: TagConfig, name: string): boolean {
  return config.domains.some(d => d.name === name);
}

export function hasTopic(config: TagConfig, name: string): boolean {
  return config.domains.some(d => d.topics.some(t => t.name === name));
}

export function hasMethod(config: TagConfig, name: string): boolean {
  return config.methods.some(m => m.name === name);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function stripHash(tag: string): string {
  return tag.replace(/^#/, '');
}

export function addHash(tag: string): string {
  return tag.startsWith('#') ? tag : `#${tag}`;
}
