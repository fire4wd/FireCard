/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BusinessCard {
  id: string;
  name: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  category: string;
  notes?: string;
  rawOcr?: string;
  frontImage?: string;
  backImage?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  order?: number;
  createdAt: string;
}

export const DEFAULT_CATEGORIES = [
  "Persona",
  "Negozio", 
  "Artigiano",
  "Ristorante",
  "Altro"
];
