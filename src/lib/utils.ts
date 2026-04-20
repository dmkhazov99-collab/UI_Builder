/**
 * ============================================
 * MODULE: Class Name Merge Helper
 * VERSION: 1.0.0
 * ROLE:
 * Утилита для безопасной композиции CSS class names
 * в React/Tailwind UI-слое.
 *
 * RESPONSIBILITIES:
 * - Принимать набор class value аргументов
 * - Нормализовать class names через clsx
 * - Разрешать конфликты Tailwind-классов через tailwind-merge
 *
 * DEPENDS ON:
 * - clsx
 * - tailwind-merge
 *
 * USED BY:
 * - React components
 * - UI panels
 * - shared component layer
 *
 * RULES:
 * - Только pure utility logic
 * - Без UI, state и runtime/export логики
 * - Используется как единая helper-точка для merge class names
 *
 * SECURITY:
 * - Не выполняет пользовательский код
 * - Работает только со строковой композицией CSS-классов
 * ============================================
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * ============================================
 * BLOCK: Public API
 * VERSION: 1.0.0
 * PURPOSE:
 * Публичный helper для объединения и нормализации
 * CSS class names с учетом Tailwind-конфликтов.
 * ============================================
 */
export function cn(...inputs: ClassValue[]): string {
  const normalizedClassName = clsx(inputs);

  return twMerge(normalizedClassName);
}