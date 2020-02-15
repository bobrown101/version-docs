import * as core from '@actions/core'
import {execSync} from 'child_process'
import {logError} from './log'

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

async function run(): Promise<void> {
  try {
    // First we need to version the resource
    const root = '.'
    const out = '.'
    const source = core.getInput('doc-location')
    const docsBranch = core.getInput('doc-branch')
    const commitMsg =
      core.getInput('commitMsg') || 'docs: versioned docs via version-docs'

    const versionCommand = `npx version-resource --root ${root} --source ${source} --out ${out}`
    try {
      execSync(versionCommand)
      const result = execSync('ls -al')
      console.log(result.toString())
    } catch (error) {
      const msg = `The following command failed:\n ${versionCommand}`
      logError(msg)
      core.setFailed(msg)
      process.exit(1)
    }

    // Second we need to checkout to the target branch

    try {
      execSync(`git config --local user.email "action@github.com"`)
      execSync(`git config --local user.name "GitHub Action"`)
      execSync(`git fetch origin`)
      execSync(`git checkout origin ${docsBranch}`)
    } catch (error) {
      console.log(execSync(`git branch -a`).toString())
      console.error(error)
      const msg = `Could not checkout branch ${docsBranch}. Are you sure it exists? If not please create it`
      logError(msg)
      core.setFailed(msg)
      process.exit(1)
    }

    // Third we need to add and commit the versioned resource
    try {
      const gitRef = requireEnvVar('GITHUB_REF')
      const gitBranch = gitRef.split('/')[2]
      execSync(`git add ${gitBranch}`)
      execSync(`git commit -m "${commitMsg}" --no-verify`)
    } catch (error) {
      console.error(error)
      const msg = `Could not commit versioned documentation`
      logError(msg)
      core.setFailed(msg)
      process.exit(1)
    }

    // Last we need to push the versioned resource to the target branch
    try {
      console.log(JSON.stringify(process.env, null, 4))
      const githubActor = requireEnvVar('GITHUB_ACTOR')
      const githubToken = requireEnvVar('INPUT_GITHUB-TOKEN')

      const repo = requireEnvVar('GITHUB_REPOSITORY')
      const remoteRepo = `https://${githubActor}:${githubToken}@github.com/${repo}.git`
      execSync(`git push "${remoteRepo}" HEAD:${docsBranch}`)
    } catch (error) {
      console.error(error)
      const msg = `Could not push docs to docsBranch ${docsBranch}`
      logError(msg)
      core.setFailed(msg)
      process.exit(1)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
