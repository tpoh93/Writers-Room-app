import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { createPinia } from 'pinia'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import Dashboard from '@renderer/views/Dashboard.vue'
import EditorHeader from '@renderer/components/common/EditorHeader.vue'
import i18n, {
  elementPlusLocale,
  getCardDisplayTitle,
  getCardTypeDisplayDescription,
  getCardTypeDisplayName,
  getProjectDisplayName,
  getProjectTemplateDisplayName,
  getRelationKindDisplayName,
  getRelationStanceDisplayName,
  getSchemaDisplayText,
  getWorkflowNodeDisplay,
} from '@renderer/i18n'
import {
  getAssistantSessionDisplayTitle,
  useAssistantSessionHistory,
} from '@renderer/composables/useAssistantSessionHistory'
import type { AssistantPanelMessage } from '@renderer/types/assistantPanel'

vi.mock('@renderer/api/projects', () => ({
  getProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))

describe('Polish interface localization', () => {
  it('uses Polish defaults and renders the Polish dashboard without exposing keys', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [createPinia(), i18n, [ElementPlus, { locale: elementPlusLocale }]],
      },
    })

    expect(i18n.global.locale.value).toBe('pl')
    expect(i18n.global.fallbackLocale.value).toBe('pl')
    expect(i18n.global.te('common.save')).toBe(true)
    expect(i18n.global.te('project.createTitle')).toBe(true)
    expect(elementPlusLocale.name).toBe('pl')
    expect(elementPlusLocale.el.select.noData).toBe('Brak danych')
    expect(elementPlusLocale.el.dialog.close).toBe('Zamknij')
    expect(elementPlusLocale.el.messagebox.close).toBe('Zamknij')
    expect(elementPlusLocale.el.pagination.prev).toBe('Poprzednia strona')
    expect(elementPlusLocale.el.pagination.next).toBe('Następna strona')
    expect(elementPlusLocale.el.pagination.page).toBe('Strona')
    expect(elementPlusLocale.el.pagination.currentPage).toBe('Strona {pager}')
    expect(elementPlusLocale.el.pagination.prevPages).toBe('Poprzednie {pager} strony')
    expect(elementPlusLocale.el.pagination.nextPages).toBe('Następne {pager} strony')
    expect(i18n.global.t('chapterEditor.targetStatus', { count: 1 }, 1)).toBe('Cel · 1 słowo')
    expect(i18n.global.t('chapterEditor.targetStatus', { count: 2 }, 2)).toBe('Cel · 2 słowa')
    expect(i18n.global.t('chapterEditor.targetStatus', { count: 5 }, 5)).toBe('Cel · 5 słów')
    expect(i18n.global.t('cardExport.summary', { count: 1, format: 'JSON' }, 1)).toBe(
      'Do eksportu: 1 karta. Format: JSON.'
    )
    expect(i18n.global.t('outline.chapterTitle', { number: 7, title: 'Próba' })).toBe(
      'Rozdział 7 | Próba',
    )
    expect(i18n.global.t('settings.knowledgeReferenceHint')).toContain('@KB{ id=... }')
    expect(i18n.global.t('settings.templateHint')).toBe(
      'Definiuj zmienne jako ${variable}, na przykład ${text_content}.',
    )
    expect(i18n.global.t('settings.reactModeHint')).toContain('<Action>{...}</Action>')
    expect(i18n.global.t('editor.contextTemplatePlaceholder')).toContain(
      'Możesz używać odwołań @.',
    )
    expect(i18n.global.te('workflow.generatedCodeEmpty')).toBe(true)
    expect(
      getWorkflowNodeDisplay(
        {
          type: 'Logic.Delay',
          label: '延迟',
          description: '延迟指定时间后继续',
        },
        i18n.global.t,
      ),
    ).toMatchObject({
      label: 'Opóźnienie',
      description: 'Kontynuuje po upływie wskazanego czasu.',
    })
    expect(getAssistantSessionDisplayTitle('新对话')).toBe('Nowa rozmowa')
    expect(getAssistantSessionDisplayTitle('Tytuł użytkownika')).toBe('Tytuł użytkownika')
    expect(getCardDisplayTitle('新卡片')).toBe('Nowa karta')
    expect(getCardDisplayTitle('新建卡片')).toBe('Nowa karta')
    expect(getCardDisplayTitle('Tytuł użytkownika')).toBe('Tytuł użytkownika')
    expect(getCardTypeDisplayName('新类型')).toBe('Nowy typ')
    expect(getCardTypeDisplayName('新建卡片')).toBe('Nowa karta')
    expect(getCardTypeDisplayName('Postać')).toBe('Postać')
    expect(getCardTypeDisplayDescription('Postać的默认卡片类型', 'Postać')).toBe(
      'Domyślny typ karty: Postać',
    )
    expect(getCardTypeDisplayDescription('Opis użytkownika', 'Postać')).toBe(
      'Opis użytkownika',
    )
    expect(wrapper.text()).toContain('Biblioteka projektów')
    expect(wrapper.text()).toContain('Nowy projekt')
    expect(wrapper.text()).not.toContain('dashboard.title')
    expect(wrapper.text()).not.toContain('common.save')
    expect(wrapper.text()).not.toContain('project.createTitle')
  })

  it('keeps the legacy assistant-session sentinel out of persisted localized copy', () => {
    const messages = ref<AssistantPanelMessage[]>([])
    const { currentSession } = useAssistantSessionHistory({
      projectId: ref(42),
      messages,
    })

    expect(currentSession.value.title).toBe('新对话')
    expect(getAssistantSessionDisplayTitle(currentSession.value.title)).toBe('Nowa rozmowa')
  })

  it('maps built-in canonical values for display without changing unknown author values', () => {
    expect(Object.fromEntries([
      ['通用文本', 'Tekst ogólny'], ['作品标签', 'Tagi utworu'], ['金手指', 'Specjalny atut bohatera'],
      ['一句话梗概', 'Logline'], ['故事大纲', 'Zarys fabuły'], ['世界观设定', 'Świat przedstawiony'],
      ['核心蓝图', 'Rdzeń historii'], ['分卷大纲', 'Zarys tomu'], ['写作指南', 'Założenia pisarskie'],
      ['阶段大纲', 'Zarys etapu'], ['章节大纲', 'Zarys rozdziału'], ['章节正文', 'Treść rozdziału'],
      ['内容审核卡片', 'Karta oceny treści'], ['角色卡', 'Karta postaci'], ['场景卡', 'Karta sceny'],
      ['组织卡', 'Karta organizacji'], ['物品卡', 'Karta przedmiotu'], ['概念卡', 'Karta pojęcia'], ['文件夹', 'Folder'],
    ].map(([raw]) => [raw, getCardTypeDisplayName(raw)]))).toEqual({
      '通用文本': 'Tekst ogólny', '作品标签': 'Tagi utworu', '金手指': 'Specjalny atut bohatera',
      '一句话梗概': 'Logline', '故事大纲': 'Zarys fabuły', '世界观设定': 'Świat przedstawiony',
      '核心蓝图': 'Rdzeń historii', '分卷大纲': 'Zarys tomu', '写作指南': 'Założenia pisarskie',
      '阶段大纲': 'Zarys etapu', '章节大纲': 'Zarys rozdziału', '章节正文': 'Treść rozdziału',
      '内容审核卡片': 'Karta oceny treści', '角色卡': 'Karta postaci', '场景卡': 'Karta sceny',
      '组织卡': 'Karta organizacji', '物品卡': 'Karta przedmiotu', '概念卡': 'Karta pojęcia', '文件夹': 'Folder',
    })
    expect(Object.fromEntries([
      ['同盟', 'Sojusz'], ['队友', 'Towarzysze'], ['同门', 'Wspólna szkoła lub tradycja'], ['敌对', 'Wrogość'],
      ['亲属', 'Pokrewieństwo'], ['师徒', 'Mistrz i uczeń'], ['对手', 'Rywalizacja'], ['伙伴', 'Partnerstwo'],
    ].map(([raw]) => [raw, getRelationKindDisplayName(raw)]))).toEqual({
      '同盟': 'Sojusz', '队友': 'Towarzysze', '同门': 'Wspólna szkoła lub tradycja', '敌对': 'Wrogość',
      '亲属': 'Pokrewieństwo', '师徒': 'Mistrz i uczeń', '对手': 'Rywalizacja', '伙伴': 'Partnerstwo',
    })
    expect(Object.fromEntries([
      ['友好', 'Przyjazne'], ['中立', 'Neutralne'], ['敌意', 'Wrogie'],
    ].map(([raw]) => [raw, getRelationStanceDisplayName(raw)]))).toEqual({
      '友好': 'Przyjazne', '中立': 'Neutralne', '敌意': 'Wrogie',
    })
    expect(getProjectTemplateDisplayName('项目创建·雪花创作法')).toBe(
      'Tworzenie projektu · metoda płatka śniegu',
    )
    expect(getProjectDisplayName('__free__')).toBe('Pracownia pomysłów')
    expect(getSchemaDisplayText('主题')).toBe('Motyw')
    expect(getSchemaDisplayText('主题类别，格式：大类-子类')).toBe(
      'Kategoria motywu, format: kategoria główna – podkategoria',
    )
    expect(getSchemaDisplayText('story_tags')).toBe('Tagi historii')
    expect(getCardTypeDisplayName('Tytuł autora po chińsku')).toBe('Tytuł autora po chińsku')
  })

  it('does not emit a localized card title when only the raw prop changes', async () => {
    const wrapper = mount(EditorHeader, {
      props: {
        projectName: 'Projekt testowy',
        cardType: '新类型',
        title: 'Tytuł bazowy',
        dirty: false,
        saving: false,
      },
      global: {
        plugins: [i18n, [ElementPlus, { locale: elementPlusLocale }]],
      },
    })

    expect(wrapper.find('input').element.value).toBe('Tytuł bazowy')
    expect(wrapper.emitted('update:title')).toBeUndefined()

    await wrapper.setProps({ title: '新建卡片' })

    expect(wrapper.find('input').element.value).toBe('Nowa karta')
    expect(wrapper.emitted('update:title')).toBeUndefined()

    await wrapper.find('input').setValue('Tytuł użytkownika')
    expect(wrapper.emitted('update:title')).toEqual([['Tytuł użytkownika']])
  })
})
