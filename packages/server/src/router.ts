import type { RouteDefinition, RouteHandler, HttpMethod } from './types.js';

function compilePath(path: string): { pattern: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regex = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name: string) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { pattern: new RegExp(`^${regex}$`), paramNames };
}

export class Router {
  private routes: RouteDefinition[] = [];

  add(method: HttpMethod, path: string, handler: RouteHandler): this {
    const { pattern, paramNames } = compilePath(path);
    this.routes.push({ method, pattern, paramNames, handler });
    return this;
  }

  get(path: string, handler: RouteHandler): this {
    return this.add('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.add('POST', path, handler);
  }

  patch(path: string, handler: RouteHandler): this {
    return this.add('PATCH', path, handler);
  }

  delete(path: string, handler: RouteHandler): this {
    return this.add('DELETE', path, handler);
  }

  match(method: HttpMethod, pathname: string): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1] ?? '');
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}
