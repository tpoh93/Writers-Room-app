import { createI18n } from 'vue-i18n'
import elementPlusPl from 'element-plus/es/locale/lang/pl'

import pl from './locales/pl'

function polishPluralRule(choice: number, choicesLength: number): number {
  const value = Math.abs(choice)
  if (value === 0) return 0
  if (value === 1) return 1
  if (
    value % 10 >= 2
    && value % 10 <= 4
    && (value % 100 < 12 || value % 100 > 14)
  ) {
    return 2
  }
  return choicesLength < 4 ? 2 : 3
}

const i18n = createI18n({
  legacy: false,
  locale: 'pl',
  fallbackLocale: 'pl',
  pluralRules: {
    pl: polishPluralRule,
  },
  messages: {
    pl,
  },
})

const LEGACY_CARD_TITLES = new Set(['新卡片', '新建卡片'])
const LEGACY_CARD_TYPE_NAME = '新类型'
const LEGACY_CARD_TYPE_DESCRIPTION_SUFFIX = '的默认卡片类型'

export function getCardDisplayTitle(title: string): string {
  return LEGACY_CARD_TITLES.has(title) ? i18n.global.t('editor.defaultCardTitle') : title
}

export function getCardTypeDisplayName(name: string): string {
  if (name === LEGACY_CARD_TYPE_NAME) return i18n.global.t('editor.defaultTypeName')
  return LEGACY_CARD_TITLES.has(name) ? i18n.global.t('editor.defaultCardTitle') : name
}

export function getCardTypeDisplayDescription(description: string, typeName: string): string {
  if (description === `${typeName}${LEGACY_CARD_TYPE_DESCRIPTION_SUFFIX}`) {
    return i18n.global.t('editor.defaultCardTypeDescription', {
      name: getCardTypeDisplayName(typeName),
    })
  }
  return description
}

type WorkflowNodeForDisplay = {
  type: string
  label: string
  description?: string
}

type Translate = (key: string) => string

export function getWorkflowNodeDisplay<T extends WorkflowNodeForDisplay>(
  node: T,
  t: Translate,
): T {
  const nodeKey = node.type.replace(/[^A-Za-z0-9]/g, '_')
  const labelKey = `workflow.nodeMetadata.${nodeKey}.label`
  const descriptionKey = `workflow.nodeMetadata.${nodeKey}.description`
  const translatedLabel = t(labelKey)
  const translatedDescription = t(descriptionKey)

  return {
    ...node,
    label: translatedLabel === labelKey ? node.label : translatedLabel,
    description:
      translatedDescription === descriptionKey ? node.description : translatedDescription,
  }
}

export const elementPlusLocale = {
  ...elementPlusPl,
  el: {
    ...elementPlusPl.el,
    dialog: {
      close: 'Zamknij',
    },
    messagebox: {
      ...elementPlusPl.el.messagebox,
      close: 'Zamknij',
    },
    pagination: {
      ...elementPlusPl.el.pagination,
      page: 'Strona',
      prev: 'Poprzednia strona',
      next: 'Następna strona',
      currentPage: 'Strona {pager}',
      prevPages: 'Poprzednie {pager} strony',
      nextPages: 'Następne {pager} strony',
    },
  },
}
export default i18n
