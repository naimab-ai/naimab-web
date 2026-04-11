Current default installer source:

`https://downloads.naimab.com/Naimab-0.1.0-win-x64.exe`

Local fallback installer path:

`/Naimab-0.1.0-win-x64.exe`

The stable public URL remains:

`/testx/download`

You can still override the source in the Worker environment:

- `TESTX_INSTALLER_URL=https://downloads.example.com/Naimab-0.1.0-win-x64.exe`
- Optional: `TESTX_INSTALLER_FILENAME=Naimab-0.1.0-win-x64.exe`

When `TESTX_INSTALLER_URL` is set, `/testx/download` will stream that file and keep the same public route.
