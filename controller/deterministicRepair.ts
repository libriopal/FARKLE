import { Project } from 'ts-morph';

export class AstService {
  static tryFix(filePath: string): boolean {
    try {
      const project = new Project();
      const sf = project.addSourceFileAtPath(filePath);
      
      // Target obvious omissions safely without tokens
      sf.fixMissingImports();
      const needsDefault = sf.getClasses().length > 0 && !sf.getDefaultExportSymbol();
      if (needsDefault) {
        sf.getClasses()[0].setIsDefaultExport(true);
      }
      
      sf.saveSync();
      return true; // Structure technically mutated
    } catch {
      return false;
    }
  }
}

export class RegexService {
  static tryFix(code: string): { code: string, changed: boolean } {
    let mut = code.replace(/;{2,}/g, ';');
    // Basic banned imports scrubber if configured
    mut = mut.replace(/import {.*} from 'banned-library';/g, '');
    mut = mut.replace(/^undefined$/gm, '');
    
    return { code: mut, changed: mut !== code };
  }
}
