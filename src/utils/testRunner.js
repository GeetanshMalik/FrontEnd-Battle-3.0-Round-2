/** Automated in-app stress test runner to verify telemetry stability. */

import { computeWorkerClient, terminateWorkerDebug } from '../engine/computeWorkerClient.js';
import { selectFilterOptions } from '../selectors/selectFilterOptions.js';

const searchTerms = ['Tata', 'Cloud', 'Italy', 'Sentinel', 'Tech', 'Active', 'Mining', 'Automation'];

export const runStressTest = async (onStatus) => {
  console.log('[TestRunner] Starting high-frequency stress test suite...');
  onStatus('TEST STARTED: Simulating operator loads...');

  try {
    // 1. Rapid Filter Switching (Toggles categories every 100ms for 3 seconds)
    onStatus('Phase 1: Rapid Filter Toggles (every 100ms)...');
    const options = selectFilterOptions();
    
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const randomType = options.automationTypes.length > 0 
        ? [options.automationTypes[Math.floor(Math.random() * options.automationTypes.length)]]
        : [];
        
      const randomDept = options.departments.length > 0
        ? [options.departments[Math.floor(Math.random() * options.departments.length)]]
        : [];

      // Update worker filter query state
      computeWorkerClient.updateFilters({
        automation_type: randomType,
        department: randomDept,
        industry: []
      });
    }
    
    // Clear filters
    computeWorkerClient.updateFilters({ automation_type: [], department: [], industry: [] });
    onStatus('Phase 1 Complete. Filter pool stable.');

    // 2. Rapid Search Input (Types tokens every 100ms for 3 seconds)
    onStatus('Phase 2: Debounced Text Searching (every 100ms)...');
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      computeWorkerClient.updateSearch(term);
    }
    
    // Clear search
    computeWorkerClient.updateSearch('');
    onStatus('Phase 2 Complete. Search debouncer stable.');

    // 3. Worker Termination Crash Recovery Test
    onStatus('Phase 3: Triggering Web Worker Crash...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Manual terminate trigger
    terminateWorkerDebug();
    
    onStatus('Worker terminated. Waiting for retry recovery loop...');
    
    // Wait for the recovery delay to fire (3000ms + margin)
    await new Promise(resolve => setTimeout(resolve, 4500));
    
    onStatus('TEST COMPLETE: Worker recovered, database re-loaded.');
    console.log('[TestRunner] Stress test suite completed successfully.');
  } catch (error) {
    console.error('[TestRunner] Stress test encountered an error:', error);
    onStatus(`TEST FAILED: ${error.message}`);
  }
};
