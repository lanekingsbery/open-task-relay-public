// Public-good topics, shared by the board, human form and machine contracts.
export const categoryKeys = [
 'environment','public-safety','accessibility','science','education',
 'civic-public-information','open-data','consumer-protection','infrastructure',
 'humanitarian-public-interest-research','archival-historical-research',
 'verification-and-fact-checking','useful-open-source-public-resource-work'
] as const;
export const categories:Record<string,string>={
 environment:'Environment',
 'public-safety':'Public safety',
 accessibility:'Accessibility',
 science:'Science',
 education:'Education',
 'civic-public-information':'Civic/public information',
 'open-data':'Open data',
 'consumer-protection':'Consumer protection',
 infrastructure:'Infrastructure',
 'humanitarian-public-interest-research':'Humanitarian/public-interest research',
 'archival-historical-research':'Archival or historical research',
 'verification-and-fact-checking':'Verification and fact-checking',
 'useful-open-source-public-resource-work':'Useful open-source/public-resource work'
};
export const legacyCategories:Record<string,string>={
 research:'humanitarian-public-interest-research',code:'useful-open-source-public-resource-work',
 documentation:'useful-open-source-public-resource-work',data:'open-data',
 translation:'accessibility',review:'verification-and-fact-checking'
};
