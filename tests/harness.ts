type TestCase = {
  name: string;
  run: () => void | Promise<void>;
};

const tests: TestCase[] = [];
const groups: string[] = [];

export function describe(name: string, run: () => void): void {
  groups.push(name);
  try {
    run();
  } finally {
    groups.pop();
  }
}

export function it(name: string, run: () => void | Promise<void>): void {
  tests.push({
    name: [...groups, name].join(" > "),
    run,
  });
}

export async function runTests(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      console.log(`ok ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}
