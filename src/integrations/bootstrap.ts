/**
 * Регистрирует конкретные провайдеры в IntegrationService. Side-effect
 * import — импортируется ради регистрации, не ради экспортов (registry-
 * паттерн Task 3.1: IntegrationService намеренно не знает о конкретных
 * провайдерах, пока кто-то явно их не зарегистрирует). Импортировать этот
 * файл нужно до первого вызова IntegrationService — обычно один раз в
 * соответствующем API route.
 */
import { registerIntegrationProvider } from './IntegrationService';
import { createInstagramProvider } from './providers/instagram';

registerIntegrationProvider(createInstagramProvider());
