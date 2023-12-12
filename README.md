# pretty-fast-xml

A simple XML formatter and minimizer.

## Install

```bash
npm install pretty-fast-xml
```

## Usage

```ts
import { formatXml, formatOptions } from 'pretty-fast-xml';

const options: formatOptions = {
  indentSize: 2,
  removeComments: false,
};

const rawXml = '<foo></foo>';
const formattedXml = formatXml(rawXml);
```
