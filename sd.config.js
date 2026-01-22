import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// 토큰 JSON 불러오기
const rawTokens = JSON.parse(readFileSync('krds-token.json', 'utf-8'));

// 토큰 구조 변환 함수
function transformTokens(tokens) {
  const result = {};
  
  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'global') {
      // global은 비어있으면 스킵
      if (Object.keys(value).length > 0) {
        result[key] = value;
      }
    } else if (key === 'primitive/value-set') {
      // primitive/value-set → primitive로 변환
      result['primitive'] = value;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// 참조 경로 업데이트 함수 (재귀적으로 모든 value 수정)
function updateReferences(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'value' && typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      // {color.light.primary.50} → {primitive.color.light.primary.50}
      const refPath = value.slice(1, -1); // { } 제거
      
      // color, typo, number로 시작하면 primitive. 추가
      if (refPath.startsWith('color.') || refPath.startsWith('typo.') || refPath.startsWith('number.')) {
        result[key] = `{primitive.${refPath}}`;
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object') {
      result[key] = updateReferences(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// 1단계: 구조 변환
let transformedTokens = transformTokens(rawTokens);

// 2단계: 참조 경로 업데이트
transformedTokens = updateReferences(transformedTokens);

// 변환된 토큰을 저장
if (!existsSync('tokens')) {
  mkdirSync('tokens');
}
writeFileSync('tokens/transformed-tokens.json', JSON.stringify(transformedTokens, null, 2));

console.log('✅ 토큰 변환 완료: tokens/transformed-tokens.json');

export default {
  source: ["tokens/transformed-tokens.json"],
  
  platforms: {
    css: {
      transforms: [
        "attribute/cti", 
        "name/kebab", 
        "color/css", 
        "size/px"
      ],
      buildPath: "styles/",
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
          filter: (token) => !!token.value
        }
      ]
    }
  }
};