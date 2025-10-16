import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddSavedCardIdToPayments1734790000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add saved_card_id column to payments table
    await queryRunner.addColumn(
      'payments',
      new TableColumn({
        name: 'saved_card_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['saved_card_id'],
        referencedTableName: 'saved_cards',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    const table = await queryRunner.getTable('payments');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('saved_card_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('payments', foreignKey);
    }

    // Drop column
    await queryRunner.dropColumn('payments', 'saved_card_id');
  }
}

