import { CronJob } from 'cron'
import { config } from '@/config'
import { ScraperService } from './service'

let schedulerJob: CronJob | null = null

export function startScraperScheduler(): void {
  if (schedulerJob) {
    console.log('Scraper scheduler already running')
    return
  }

  // Run every N hours based on config
  const cronExpression = `0 */${config.scraper.intervalHours} * * *`

  schedulerJob = new CronJob(
    cronExpression,
    async () => {
      console.log('Starting scheduled scrape...')
      try {
        const results = await ScraperService.scrapeAll()
        for (const [source, count] of results) {
          if (count >= 0) {
            console.log(`Scheduled scrape: ${source} - ${count} torrents`)
          } else {
            console.log(`Scheduled scrape: ${source} - failed`)
          }
        }
      } catch (error) {
        console.error('Scheduled scrape failed:', error)
      }
    },
    null, // onComplete
    true, // start immediately
    'UTC'
  )

  console.log(
    `Scraper scheduler started (every ${config.scraper.intervalHours} hours)`
  )
}

export function stopScraperScheduler(): void {
  if (schedulerJob) {
    schedulerJob.stop()
    schedulerJob = null
    console.log('Scraper scheduler stopped')
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerJob !== null && schedulerJob.running
}

export function getNextScheduledRun(): Date | null {
  if (!schedulerJob) return null
  return schedulerJob.nextDate().toJSDate()
}
