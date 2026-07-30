/**
 * Schema字段解析服务
 * 用于解析JSON Schema的字段结构，支持嵌套对象、引用和anyOf
 * 与现有的schemaService集成，提供统一的Schema解析能力
 * 
 * 统一解析入口：
 * - 卡片渲染时：ModelDrivenForm.vue -> resolveActualSchema()
 * - 工作流预览时：WorkflowParamPanel.vue -> parseSchemaFields()
 * - 数组字段解析：ArrayField.vue -> resolveActualSchema() + createDefaultValue()
 * - 设置界面编辑：使用独立的outputModelSchemaUtils.ts（专门用于Schema编辑器）
 */

import { schemaService } from '@renderer/api/schema'
import { getSchemaDisplayText } from '@renderer/i18n'


export interface ParsedField {
  name: string
  title: string
  type: string
  path: string
  description: string
  required: boolean
  expanded: boolean
  children?: ParsedField[]
  expandable?: boolean
  arrayItemType?: string
  hasChildren?: boolean
}

/**
 * 解析JSON Schema字段结构
 * @param schema JSON Schema对象
 * @param path 字段路径前缀
 * @param maxDepth 最大递归深度
 * @returns 解析后的字段列表
 */
export function parseSchemaFields(schema: any, path = '$.content', maxDepth = 5): ParsedField[] {
  if (maxDepth <= 0) return []
  
  const fields: ParsedField[] = []
  try {
    const properties = schema.properties || {}
    const defs = schema.$defs || {}
    const required = schema.required || []
    
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      if (typeof fieldSchema !== 'object' || !fieldSchema) continue
      
      // 解析引用和anyOf
      const resolvedSchema = resolveSchemaRef(fieldSchema as any, defs)
      
      const fieldType = resolvedSchema.type || 'unknown'
      const fieldTitle = getSchemaDisplayText(resolvedSchema.title) || fieldName
      const fieldDescription = getSchemaDisplayText(resolvedSchema.description) || ''
      const fieldPath = `${path}.${fieldName}`
      
      const fieldInfo: ParsedField = {
        name: fieldName,
        title: fieldTitle,
        type: fieldType,
        path: fieldPath,
        description: fieldDescription,
        required: required.includes(fieldName),
        expanded: false
      }
      
      // 处理嵌套对象
      if (fieldType === 'object' && resolvedSchema.properties) {
        const children = parseSchemaFields(resolvedSchema, fieldPath, maxDepth - 1)
        if (children.length > 0) {
          fieldInfo.children = children
          fieldInfo.expandable = true
          fieldInfo.hasChildren = true
        }
      }
      
      // 处理数组类型
      else if (fieldType === 'array' && resolvedSchema.items) {
        const itemsSchema = resolveSchemaRef(resolvedSchema.items, defs)
        if (itemsSchema.type === 'object' && itemsSchema.properties) {
          const children = parseSchemaFields(itemsSchema, `${fieldPath}[0]`, maxDepth - 1)
          if (children.length > 0) {
            fieldInfo.children = children
            fieldInfo.expandable = true
            fieldInfo.hasChildren = true
            fieldInfo.arrayItemType = 'object'
          }
        } else {
          fieldInfo.arrayItemType = itemsSchema.type || 'unknown'
        }
      }
      
      fields.push(fieldInfo)
    }
  } catch (e) {
    console.warn('解析Schema字段失败:', e)
  }
  
  return fields
}

/**
 * 解析Schema引用，支持本地$defs和全局schemaService
 * @param schema Schema对象
 * @param localDefs 本地$defs定义
 * @returns 解析后的Schema对象
 */
export function resolveSchemaRef(schema: any, localDefs?: any): any {
  if (!schema || typeof schema !== 'object') return schema
  
  // 处理anyOf类型 - 优先处理
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    for (const anySchema of schema.anyOf) {
      if (anySchema.type === 'null') continue
      
      // 递归解析anyOf中的引用
      const resolved = resolveSchemaRef(anySchema, localDefs)
      if (resolved && resolved.type && resolved.type !== 'null') {
        return {
          ...resolved,
          title: schema.title || resolved.title,
          description: schema.description || resolved.description
        }
      }
    }
  }
  
  // 处理$ref引用
  if (schema.$ref && typeof schema.$ref === 'string') {
    const refPath = schema.$ref
    if (refPath.startsWith('#/$defs/')) {
      const refName = refPath.replace('#/$defs/', '')
      
      // 优先使用本地$defs
      let resolved = localDefs && localDefs[refName] ? localDefs[refName] : null
      
      // 如果本地没有，尝试从全局schemaService获取
      if (!resolved) {
        resolved = schemaService.getSchema(refName)
      }
      
      if (resolved) {
        // 递归解析引用的定义（可能还包含其他引用）
        const finalResolved = resolveSchemaRef(resolved, localDefs)
        return {
          ...finalResolved,
          title: schema.title || finalResolved.title,
          description: schema.description || finalResolved.description
        }
      }
    }
  }
  
  return schema
}

/**
 * 获取字段类型对应的图标
 * @param type 字段类型
 * @returns 图标字符
 */
export function getFieldIcon(type: string): string {
  switch (type) {
    case 'object': return '📁'
    case 'array': return '📊'
    case 'string': return '📄'
    case 'number': 
    case 'integer': return '🔢'
    case 'boolean': return '☑️'
    default: return '📄'
  }
}

/**
 * 切换字段的展开/折叠状态
 * @param fields 字段列表
 * @param targetPath 目标字段路径
 */
export function toggleFieldExpanded(fields: ParsedField[], targetPath: string): void {
  for (const field of fields) {
    if (field.path === targetPath) {
      field.expanded = !field.expanded
      return
    }
    if (field.children) {
      toggleFieldExpanded(field.children, targetPath)
    }
  }
}

/**
 * 从解析的字段中提取所有字段路径选项
 * @param fields 解析后的字段列表
 * @param options 累积的选项数组
 * @returns 字段路径选项数组
 */
export function extractFieldPathOptions(fields: ParsedField[], options: Array<{ label: string; value: string }> = []): Array<{ label: string; value: string }> {
  for (const field of fields) {
    // 只添加非对象类型的字段，或者没有子字段的对象
    if (field.type !== 'object' || !field.children?.length) {
      // 移除 $.content 前缀，显示相对路径
      const label = field.path.replace(/^\$\.content\.?/, '') || field.name
      options.push({
        label: label,
        value: field.path
      })
    }
    
    // 递归处理子字段
    if (field.children?.length) {
      extractFieldPathOptions(field.children, options)
    }
  }
  
  return options
}

/**
 * 为ModelDrivenForm等组件提供的Schema解析函数
 * 与原有的resolveActualSchema逻辑兼容
 * @param schema Schema对象
 * @param parentSchema 父级Schema（用于获取$defs）
 * @returns 解析后的Schema对象
 */
export function resolveActualSchema(schema: any, parentSchema?: any): any {
  const localDefs = parentSchema?.$defs || {}
  // 先解析当前节点自身（处理直接的 anyOf / $ref）
  const base = resolveSchemaRef(schema, localDefs)

  // 对于非对象或空值，直接返回解析结果
  if (!base || typeof base !== 'object') return base

  // 创建浅拷贝，避免意外修改原始 Schema
  const resolved: any = { ...base }

  // 递归解析 properties 中的子字段（保持与根级 $defs 一致）
  if (resolved.properties && typeof resolved.properties === 'object') {
    const nextProps: Record<string, any> = {}
    for (const [key, val] of Object.entries(resolved.properties)) {
      nextProps[key] = resolveSchemaRef(val as any, localDefs)
    }
    resolved.properties = nextProps
  }

  // 递归解析数组 items（特别是 items.$ref → #/$defs/ModelName 的场景）
  if (resolved.items) {
    resolved.items = resolveSchemaRef(resolved.items, localDefs)
  }

  // 递归解析元组 prefixItems
  if (Array.isArray(resolved.prefixItems)) {
    resolved.prefixItems = resolved.prefixItems.map((it: any) => resolveSchemaRef(it, localDefs))
  }

  // 递归解析 anyOf 中的子 schema
  if (Array.isArray(resolved.anyOf)) {
    resolved.anyOf = resolved.anyOf.map((it: any) => resolveSchemaRef(it, localDefs))
  }

  return resolved
}
