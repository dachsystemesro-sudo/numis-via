// Only consume a freshly computed server analysis, never a client-supplied flag.
export function valuationAllowed(analysis){
  return analysis?.status==='VERIFIED' && analysis.valuation_allowed===true &&
    typeof analysis.identity?.catalogue_id==='string' && analysis.identity.catalogue_id.length>0 &&
    Array.isArray(analysis.blockers) && analysis.blockers.length===0;
}

export function requireValuation(analysis){
  if(!valuationAllowed(analysis))throw Error('Ocenenie je zablokované.');
  return analysis.identity.catalogue_id;
}
