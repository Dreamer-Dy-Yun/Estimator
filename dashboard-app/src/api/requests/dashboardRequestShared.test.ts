import { describe, expect, it } from 'vitest'
import {
  candidateStashExcelTemplateAsset,
  candidateStashExcelTemplateFilename,
  selectCandidateStashExcelTemplateAsset,
} from './dashboardRequestShared'

describe('dashboardRequestShared template asset selection', () : void => {
  it('selects the highest Han.A template version from matching xlsx assets', () : void => {
    expect(selectCandidateStashExcelTemplateAsset({
      '../../../public/templates/(Han.A)Template(ver.0.9.9).xlsx': '/assets/template-0.9.9.xlsx',
      '../../../public/templates/other-template.xlsx': '/assets/other-template.xlsx',
      '../../../public/templates/(Han.A)Template(ver.1.2.9).xlsx': '/assets/template-1.2.9.xlsx',
      '../../../public/templates/(Han.A)Template(ver.1.10.0).xlsx': '/assets/template-1.10.0.xlsx',
    })).toEqual({
      asset: '/assets/template-1.10.0.xlsx',
      filename: '(Han.A)Template(ver.1.10.0).xlsx',
    })
  })

  it('resolves the currently shipped public template file', () : void => {
    expect(candidateStashExcelTemplateFilename).toBe('(Han.A)Template(ver.0.0.0).xlsx')
    expect(candidateStashExcelTemplateAsset).toContain('(Han.A)Template(ver.0.0.0)')
  })
})
