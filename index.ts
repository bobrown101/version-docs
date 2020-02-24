import * as core from '@actions/core'
import {execSync} from 'child_process'
import axios from 'axios'
import {logError, logInfo, logSuccess} from './log'

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

const runCommand = (cmd: string, errorMsg?: string): string => {
  try {
    const result = execSync(cmd).toString()
    console.log(result)
    return result
  } catch (error) {
    console.error(error)
    const msg = errorMsg || error.toString()
    logError(msg)
    core.setFailed(msg)
    process.exit(1)
  }
}

const commentOnCommit = async (
  comment: string,
  token: string
): Promise<void> => {
  const inputs = {
    token,
    body: comment
  }
  core.debug(`Inputs: ${JSON.stringify(inputs, null, 4)}`)

  const sha = process.env.GITHUB_SHA
  core.debug(`SHA: ${sha}`)

  await axios.post(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/commits/${sha}/comments`,
    {
      body: inputs.body
    },
    {
      headers: {authorization: `token ${inputs.token}`}
    }
  )
}

async function run(): Promise<void> {
  try {
    const githubActor = requireEnvVar('GITHUB_ACTOR')
    const githubToken = requireEnvVar('INPUT_GITHUB-TOKEN')
    const repo = requireEnvVar('GITHUB_REPOSITORY')
    const remoteRepo = `https://${githubActor}:${githubToken}@github.com/${repo}.git`
    const root = '.'
    const out = '.'
    const source = core.getInput('doc-location')
    const docsBranch = core.getInput('doc-branch')
    const commitMsg =
      core.getInput('commitMsg') || 'docs: versioned docs via version-docs'
    const gitRef = requireEnvVar('GITHUB_REF')
    const gitBranch = gitRef.split('/')[2]
    const gitCommit = runCommand(`git log -1 --format="%h"`).trim()

    runCommand(`git config --local user.email "action@github.com"`)
    runCommand(`git config --local user.name "GitHub Action"`)

    // First we need to clone the docs-branch
    runCommand(
      `git clone --single-branch --branch ${docsBranch} --depth 1 ${remoteRepo} /tmp/docsBranch`,
      `Could not find doc-branch: "${docsBranch}". If this was intentional, please create an empty branch named "${docsBranch}"`
    )

    // Then we copy over the existing .version-resource-history file in order to preserve history
    try {
      execSync(`cp /tmp/docsBranch/.version-resource-history .`)
    } catch (error) {
      logInfo('Cloud not find existing .version-resource-history. Ignoring...')
    }

    // The we run version-resource
    const versionResource = (versionName: string, versionTag: string): void => {
      const versionCommand = `npx version-resource --root ${root} --source ${source} --out ${out} --versionName ${versionName} --versionTag ${versionTag} -p`
      runCommand(versionCommand)
    }
    versionResource(gitBranch, gitCommit)
    versionResource(gitBranch, 'latest')

    // Then we copy the versioned-resources to the docs-branch location
    runCommand(`mkdir -p /tmp/docsBranch/${gitBranch}/`)
    runCommand(`rsync -a ${gitBranch}/ /tmp/docsBranch/${gitBranch}/`)
    runCommand(`mv .version-resource-history /tmp/docsBranch/`)
    try {
      runCommand(`mv index.html /tmp/docsBranch/`)
    } catch (error) {
      logInfo(
        'Could not find index.html file - this would most likely happen if no -p flag was specified, or this is the first time version-docs has been run wuth the -p flag. Ignoring...'
      )
    }

    runCommand(
      `cd /tmp/docsBranch && git config --local user.email "action@github.com"`
    )
    runCommand(
      `cd /tmp/docsBranch && git config --local user.name "GitHub Action"`
    )
    runCommand(`cd /tmp/docsBranch && git add -A`)
    runCommand(
      `cd /tmp/docsBranch && git commit -m "${commitMsg}" --no-verify && git push "${remoteRepo}" HEAD:${docsBranch}`
    )
    runCommand(
      `cd /tmp/docsBranch && git push "${remoteRepo}" HEAD:${docsBranch}`
    )

    commentOnCommit(
      `"version-docs" versioned "${source}" from branch "${gitBranch}" on documentation branch "${docsBranch}"`,
      githubToken
    )
    logSuccess(`Successfully versioned docs!`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
