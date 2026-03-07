/**
 * scode → 한자 매핑 테이블 구축
 *
 * 우리말샘/표준국어대사전 XML에서 각 단어의 의미번호(scode)와 한자(original_language)를 추출하여
 * WSD 모델의 scode 예측 결과를 실제 한자로 변환할 수 있는 매핑 테이블을 만든다.
 *
 * XML 구조:
 *   <word><![CDATA[경제01]]></word>  → 단어 "경제", scode "01"
 *   <original_language><![CDATA[經濟]]></original_language>  → 한자
 *
 * 입력:
 *   - wsd_heads.json (725개 단어 + scodes)
 *   - korean-dict-nikl/stdict/*.xml + opendict/*.xml
 *
 * 출력:
 *   - wsd_scode_hanja_map.json: { "불리": { "01": "不利", "04": "佛理", "07": "不離" }, ... }
 */

import { createReadStream } from "fs";
import { readdir, readFile, writeFile } from "fs/promises";
import { createInterface } from "readline";
import path from "path";
import sax from "sax";
const { parser: createSaxParser } = sax;

// wsd_heads.json에서 725개 단어의 scodes 추출
interface HeadEntry {
  scodes: Record<string, number>;
  weight: number[][];
  bias: number[];
}

async function loadTargetWords(
  headsPath: string
): Promise<Map<string, Set<string>>> {
  const raw = JSON.parse(await readFile(headsPath, "utf-8")) as Record<
    string,
    HeadEntry
  >;
  const targets = new Map<string, Set<string>>();
  for (const [word, entry] of Object.entries(raw)) {
    targets.set(word, new Set(Object.keys(entry.scodes)));
  }
  return targets;
}

// XML 파일 하나를 파싱하여 단어 + 의미번호 + 한자 추출
interface WordEntry {
  word: string; // "경제"
  senseNum: string; // "01"
  hanja: string; // "經濟"
}

async function parseXmlFile(filePath: string): Promise<WordEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: WordEntry[] = [];
    const parser = createSaxParser(true, { trim: true });

    // 태그 스택으로 중첩 위치 추적
    const tagStack: string[] = [];
    let currentWord = "";
    let currentHanja = "";
    let cdata = "";

    parser.onopentag = (tag) => {
      tagStack.push(tag.name);
      cdata = "";
    };

    parser.oncdata = (data) => {
      cdata += data;
    };

    parser.ontext = (text) => {
      cdata += text;
    };

    parser.onclosetag = (name) => {
      const lowerName = name.toLowerCase();

      // word_info 바로 아래의 word만 캡처 (relation_info 등 내부의 word 무시)
      if (lowerName === "word") {
        const parent = tagStack.length >= 2 ? tagStack[tagStack.length - 2].toLowerCase() : "";
        if (parent === "word_info") {
          currentWord = cdata.trim();
        }
      }

      // word_info > original_language_info > original_language만 캡처
      if (lowerName === "original_language") {
        const parent = tagStack.length >= 2 ? tagStack[tagStack.length - 2].toLowerCase() : "";
        const grandparent = tagStack.length >= 3 ? tagStack[tagStack.length - 3].toLowerCase() : "";
        if (parent === "original_language_info" && grandparent === "word_info") {
          currentHanja = cdata.trim();
        }
      }

      // item이 닫힐 때 엔트리 저장
      if (lowerName === "item") {
        if (currentWord && currentHanja) {
          // "경제01" → word="경제", senseNum="01"
          const match = currentWord.match(/^(.+?)(\d+)$/);
          if (match) {
            entries.push({
              word: match[1],
              senseNum: match[2],
              hanja: currentHanja,
            });
          }
        }
        currentWord = "";
        currentHanja = "";
      }

      tagStack.pop();
      cdata = "";
    };

    parser.onerror = (err) => {
      // XML 파싱 에러는 무시 (일부 깨진 엔트리 가능)
      parser.resume();
    };

    parser.onend = () => resolve(entries);

    // 파일을 스트리밍으로 읽기
    const stream = createReadStream(filePath, { encoding: "utf-8" });
    stream.on("data", (chunk: string) => parser.write(chunk));
    stream.on("end", () => parser.close());
    stream.on("error", reject);
  });
}

async function main() {
  const projectRoot = path.resolve(import.meta.dirname, "../..");
  const headsPath = path.join(
    projectRoot,
    "apps/extension/public/wsd/wsd_heads.json"
  );
  const dictDirs = [
    path.join(projectRoot, "korean-dict-nikl/stdict"),
    path.join(projectRoot, "korean-dict-nikl/opendict"),
  ];
  const outputPath = path.join(
    projectRoot,
    "apps/extension/public/wsd/wsd_scode_hanja_map.json"
  );

  console.log("1. 우리말샘/표준국어대사전 XML에서 전체 scode→한자 매핑 추출...");
  // targets 필터 없이 모든 단어의 매핑을 수집
  const mapping: Record<string, Record<string, string>> = {};
  let totalEntries = 0;

  for (const dictDir of dictDirs) {
    const files = (await readdir(dictDir)).filter((f) => f.endsWith(".xml"));
    const source = dictDir.includes("stdict") ? "stdict" : "opendict";
    console.log(`   ${source}: ${files.length}개 XML 파일`);

    for (const file of files) {
      const entries = await parseXmlFile(path.join(dictDir, file));
      totalEntries += entries.length;

      for (const entry of entries) {
        const paddedSenseNum = entry.senseNum.padStart(2, "0");
        if (!mapping[entry.word]) mapping[entry.word] = {};
        // stdict 우선 (이미 있으면 opendict로 덮어쓰지 않음)
        if (!mapping[entry.word][paddedSenseNum] || source === "stdict") {
          mapping[entry.word][paddedSenseNum] = entry.hanja;
        }
      }
    }
  }

  console.log(`\n2. 매핑 결과:`);
  console.log(`   XML 전체 엔트리: ${totalEntries.toLocaleString()}개`);
  const totalMappings = Object.values(mapping).reduce((s, v) => s + Object.keys(v).length, 0);
  console.log(`   매핑된 단어: ${Object.keys(mapping).length.toLocaleString()}개`);
  console.log(`   총 scode→한자 매핑: ${totalMappings.toLocaleString()}개`);

  // 저장
  await writeFile(outputPath, JSON.stringify(mapping, null, 0), "utf-8");
  console.log(`\n3. 저장: ${outputPath}`);
  const stats = await readFile(outputPath);
  console.log(`   크기: ${(stats.length / 1024).toFixed(1)}KB`);
}

main().catch(console.error);
