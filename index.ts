import * as core from '@actions/core'
import {execSync} from 'child_process'
// import axios from 'axios'
import {logError, logInfo} from './log'

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

// const commentOnCommit = async (
//   comment: string,
//   token: string
// ): Promise<void> => {
//   const inputs = {
//     token,
//     body: comment
//   }
//   core.debug(`Inputs: ${JSON.stringify(inputs, null, 4)}`)

//   const sha = process.env.GITHUB_SHA
//   core.debug(`SHA: ${sha}`)

//   await axios.post(
//     `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/commits/${sha}/comments`,
//     {
//       body: inputs.body
//     },
//     {
//       headers: {authorization: `token ${inputs.token}`}
//     }
//   )
// }

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
    // const commitMsg =
    //   core.getInput('commitMsg') || 'docs: versioned docs via version-docs'
    const gitRef = requireEnvVar('GITHUB_REF')
    const gitBranch = gitRef.split('/')[2]
    const gitCommit = runCommand(`git lZog -1 --format="%h"`).trim()

    runCommand(`git config --local user.email "action@github.com"`)
    runCommand(`git config --local user.name "GitHub Action"`)

    // First we need to clone the docs-branch
    runCommand(
      `git clone --single-branch --branch ${docsBranch} --depth 1 ${remoteRepo} /tmp/docsBranch`,
      `Could not find doc-branch: "${docsBranch}". If this was intentional, please create an empty branch named "${docsBranch}"`
    )

    const versionResource = (versionName: string, versionTag: string): void => {
      const versionCommand = `npx version-resource --root ${root} --source ${source} --out ${out} --versionName ${versionName} --versionTag ${versionTag} -p`
      runCommand(versionCommand)
    }
    versionResource(gitBranch, gitCommit)
    versionResource(gitBranch, 'latest')
    
    // Then we copy the versioned-resources to the docs-branch location
    runCommand(`mv ${gitBranch} /tmp/docsBranch/`)
    runCommand(`mv .version-resource-history /tmp/docsBranch`)
    try {
      runCommand(`mv index.html /tmp/docsBranch`)
    } catch (error) {
      logInfo(
        'Could not find index.html file - this would most likely happen if no -p flag was specified, or this is the first time version-docs has been run wuth the -p flag. Ignoring...'
      )
    }

    console.log(execSync('pwd && ls -al').toString())
    runCommand(`cd /tmp/docsBranch `)
    console.log(execSync('pwd && ls -al').toString())

    // runCommand(`git commit -m "${commitMsg}" --no-verify`)

    // runCommand(`git fetch origin`)
    // runCommand(
    //   `git checkout remotes/origin/${docsBranch}`,
    //   `Could not checkout branch ${docsBranch}. Are you sure it exists? If not please create it`
    // )
    // runCommand(`git cherry-pick temp/version-docs --strategy-option=theirs`)

    // runCommand(
    //   `git push "${remoteRepo}" HEAD:${docsBranch}`,
    //   `Could not push docs to docsBranch ${docsBranch}`
    // )

    // commentOnCommit(
    //   `"version-docs" versioned "${source}" from branch "${gitBranch}" on documentation branch "${docsBranch}"`,
    //   githubToken
    // )

    // logSuccess(`Successfully versioned docs!`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
