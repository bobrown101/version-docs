import * as core from '@actions/core'
import {execSync} from 'child_process'
import {logError, logSuccess} from './log'

const requireEnvVar = (envVar: string): string => {
  const requested = process.env[envVar]
  if (requested) {
    return requested
  } else {
    const msg = `The enviornment variable "${envVar}" does not exist. It is required to run version-docs`
    logError(msg)
    core.setFailed(msg)
    process.exit(1)
  }
}

const runCommand = (cmd: string, errorMsg?: string): void => {
  try {
    console.log(execSync(cmd).toString())
  } catch (error) {
    console.error(error)
    const msg = errorMsg || error.toString()
    logError(msg)
    core.setFailed(msg)
    process.exit(1)
  }
}

async function run(): Promise<void> {
  try {
    // First we need to version the resource
    const root = '.'
    const out = '.'
    const source = core.getInput('doc-location')
    const docsBranch = core.getInput('doc-branch')
    const commitMsg =
      core.getInput('commitMsg') || 'docs: versioned docs via version-docs'
    const gitRef = requireEnvVar('GITHUB_REF')
    const gitBranch = gitRef.split('/')[2]

    runCommand(`git config --local user.email "action@github.com"`)
    runCommand(`git config --local user.name "GitHub Action"`)

    const versionCommand = `npx version-resource --root ${root} --source ${source} --out ${out}`
    runCommand(versionCommand)

    runCommand(`git checkout -b temp/version-docs`)
    runCommand(`git add ${gitBranch}`)
    runCommand(`git commit -m "${commitMsg}" --no-verify`)

    runCommand(`git fetch origin`)
    runCommand(
      `git checkout remotes/origin/${docsBranch}`,
      `Could not checkout branch ${docsBranch}. Are you sure it exists? If not please create it`
    )
    runCommand(`git cherry-pick temp/version-docs --strategy-option=theirs`)

    const githubActor = requireEnvVar('GITHUB_ACTOR')
    const githubToken = requireEnvVar('INPUT_GITHUB-TOKEN')
    const repo = requireEnvVar('GITHUB_REPOSITORY')
    const remoteRepo = `https://${githubActor}:${githubToken}@github.com/${repo}.git`

    runCommand(
      `git push "${remoteRepo}" HEAD:${docsBranch}`,
      `Could not push docs to docsBranch ${docsBranch}`
    )

    logSuccess(`Successfully versioned docs!`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
