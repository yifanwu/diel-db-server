# Notes of past bugs

## Past issues

[better-sqlite3 node compilation errors](https://github.com/JoshuaWise/better-sqlite3/issues/120) I think the issue removing `better-sqlite3` and recompiling did not solve the issue is that the other dependencies were not rebuilt.

```bash
npm rebuild integer --update-binary
npm rebuild better-sqlite3 --update-binary
npm rebuild bcrypt --update-binary
```
