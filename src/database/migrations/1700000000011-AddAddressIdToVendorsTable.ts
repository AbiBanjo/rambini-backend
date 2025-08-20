import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddAddressIdToVendorsTable1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column already exists
    const table = await queryRunner.getTable('vendors');
    const addressIdColumn = table.findColumnByName('address_id');
    
    if (!addressIdColumn) {
      // Add the address_id column
      await queryRunner.addColumn(
        'vendors',
        new TableColumn({
          name: 'address_id',
          type: 'varchar',
          length: '36',
          isNullable: false,
        }),
      );

      // Create index for address_id
      await queryRunner.createIndex(
        'vendors',
        new TableIndex({
          name: 'IDX_VENDORS_ADDRESS_ID',
          columnNames: ['address_id'],
        }),
      );

      // Create foreign key constraint
      await queryRunner.createForeignKey(
        'vendors',
        new TableForeignKey({
          name: 'FK_VENDORS_ADDRESS_ID',
          columnNames: ['address_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'addresses',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    const table = await queryRunner.getTable('vendors');
    const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('address_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('vendors', foreignKey);
    }

    // Drop index
    const index = table.indices.find(idx => idx.name === 'IDX_VENDORS_ADDRESS_ID');
    if (index) {
      await queryRunner.dropIndex('vendors', index);
    }

    // Drop column
    const addressIdColumn = table.findColumnByName('address_id');
    if (addressIdColumn) {
      await queryRunner.dropColumn('vendors', 'address_id');
    }
  }
} 