$ErrorActionPreference = 'Stop'

$projectRoot = 'C:\Users\range\Material Weakness'
$srcRoot = Join-Path $projectRoot 'src'
$mainRoot = Join-Path $srcRoot 'main'
$rendererRoot = Join-Path $srcRoot 'renderer'
$buildRoot = Join-Path $projectRoot 'build'

New-Item -ItemType Directory -Force -Path $srcRoot, $mainRoot, $rendererRoot, $buildRoot | Out-Null

$mainTs = @'
import { app, BrowserWindow } from 'electron'
import path from 'node:path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Material Weakness',
    icon: path.join(__dirname, 'icon.png'), // optional
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  void win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  win.setMenuBarVisibility(false) // cleaner look
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
'@

$viteConfig = @'
import path from 'node:path'
import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'

const external = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((moduleName) => `node:${moduleName}`),
]

export default defineConfig([
  {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/main/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
      outDir: path.resolve(__dirname, 'dist/main'),
      emptyOutDir: false,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external,
      },
      target: 'node20',
    },
  },
  {
    publicDir: false,
    build: {
      outDir: path.resolve(__dirname, 'dist/renderer'),
      emptyOutDir: false,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html'),
      },
      target: 'chrome120',
    },
  },
])
'@

$tsconfig = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "vite.config.ts"]
}
'@

$builderConfig = @'
appId: com.materialweakness.app
productName: Material Weakness
directories:
  output: release
files:
  - dist/**/*
  - package.json
win:
  target:
    - nsis
mac:
  target:
    - dmg
linux:
  target:
    - AppImage
'@

$packageJson = @'
{
  "name": "material-weakness",
  "version": "1.0.0",
  "description": "Financial Audit Simulation",
  "author": "Joshua Popchoke",
  "main": "dist/main/main.js",
  "scripts": {
    "clean": "rimraf dist release",
    "dev": "concurrently -k \"vite build --watch --mode development\" \"wait-on dist/main/main.js dist/renderer/index.html && electron .\"",
    "build": "npm run clean && vite build",
    "start": "npm run build && electron .",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:linux": "npm run build && electron-builder --linux"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "concurrently": "^9.0.0",
    "electron": "^37.2.0",
    "electron-builder": "^26.0.12",
    "rimraf": "^6.0.1",
    "typescript": "^5.8.3",
    "vite": "^7.0.0",
    "wait-on": "^8.0.0"
  }
}
'@

Set-Content -Path (Join-Path $mainRoot 'main.ts') -Value $mainTs -Encoding UTF8
Set-Content -Path (Join-Path $projectRoot 'vite.config.ts') -Value $viteConfig -Encoding UTF8
Set-Content -Path (Join-Path $projectRoot 'tsconfig.json') -Value $tsconfig -Encoding UTF8
Set-Content -Path (Join-Path $projectRoot 'electron-builder.yml') -Value $builderConfig -Encoding UTF8
Set-Content -Path (Join-Path $projectRoot 'package.json') -Value $packageJson -Encoding UTF8

$legacyHtml = Join-Path $projectRoot 'material-weakness-v2.html'
$rendererHtml = Join-Path $rendererRoot 'index.html'
Copy-Item -Path $legacyHtml -Destination $rendererHtml -Force

$legacyMain = Join-Path $projectRoot 'main.js'
if (Test-Path $legacyMain) {
  Remove-Item -Path $legacyMain -Force
}

Write-Host "Scaffolded Vite + TypeScript structure in $projectRoot"
