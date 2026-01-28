import { MigrationInterface, QueryRunner } from "typeorm";

export class InitEntity1769543900353 implements MigrationInterface {
    name = 'InitEntity1769543900353'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`media\` (\`id\` int NOT NULL AUTO_INCREMENT, \`sourceUrl\` varchar(255) NOT NULL, \`title\` varchar(255) NULL, \`url\` varchar(255) NOT NULL, \`type\` enum ('IMAGE', 'VIDEO') NOT NULL, \`metadata\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_aa020acfdfdd56e0c8c4abf433\` (\`sourceUrl\`), INDEX \`IDX_c58bf8951c9a6ba9277eebcbf5\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`sessionId\` varchar(255) NOT NULL, \`type\` enum ('GUEST') NOT NULL DEFAULT 'GUEST', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_b0e7bc1c369a84a77ed966c9fd\` (\`sessionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`scrape_history\` (\`id\` int NOT NULL AUTO_INCREMENT, \`sourceUrl\` varchar(255) NOT NULL, \`title\` varchar(255) NULL, \`mediaCount\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`userId\` int NULL, INDEX \`IDX_dacadb6d43f37e4f27a7034ebc\` (\`sourceUrl\`), UNIQUE INDEX \`IDX_fd53dd97715f1bcc96a49d7da8\` (\`userId\`, \`sourceUrl\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`scrape_history\` ADD CONSTRAINT \`FK_27be47e25c054934b0d29150def\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`scrape_history\` DROP FOREIGN KEY \`FK_27be47e25c054934b0d29150def\``);
        await queryRunner.query(`DROP INDEX \`IDX_fd53dd97715f1bcc96a49d7da8\` ON \`scrape_history\``);
        await queryRunner.query(`DROP INDEX \`IDX_dacadb6d43f37e4f27a7034ebc\` ON \`scrape_history\``);
        await queryRunner.query(`DROP TABLE \`scrape_history\``);
        await queryRunner.query(`DROP INDEX \`IDX_b0e7bc1c369a84a77ed966c9fd\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_c58bf8951c9a6ba9277eebcbf5\` ON \`media\``);
        await queryRunner.query(`DROP INDEX \`IDX_aa020acfdfdd56e0c8c4abf433\` ON \`media\``);
        await queryRunner.query(`DROP TABLE \`media\``);
    }

}
